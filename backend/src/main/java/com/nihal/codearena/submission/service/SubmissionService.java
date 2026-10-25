package com.nihal.codearena.submission.service;

import com.nihal.codearena.auth.repository.UserRepository;
import com.nihal.codearena.common.exception.ResourceNotFoundException;
import com.nihal.codearena.execution.JudgeResult;
import com.nihal.codearena.execution.JudgeResult.CaseResult;
import com.nihal.codearena.execution.JudgeService;
import com.nihal.codearena.messaging.SubmissionPublisher;
import com.nihal.codearena.problem.entity.Problem;
import com.nihal.codearena.problem.repository.ProblemRepository;
import com.nihal.codearena.submission.dto.SubmissionResponse;
import com.nihal.codearena.submission.dto.SubmitRequest;
import com.nihal.codearena.submission.entity.Submission;
import com.nihal.codearena.submission.entity.SubmissionStatus;
import com.nihal.codearena.submission.entity.SubmissionTestResult;
import com.nihal.codearena.submission.repository.SubmissionRepository;
import com.nihal.codearena.submission.repository.SubmissionTestResultRepository;
import com.nihal.codearena.testcase.entity.TestCase;
import com.nihal.codearena.testcase.repository.TestCaseRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SubmissionService {

    private static final int MAX_STORED_CHARS = 5000;

    private final SubmissionRepository submissionRepository;
    private final SubmissionTestResultRepository resultRepository;
    private final ProblemRepository problemRepository;
    private final TestCaseRepository testCaseRepository;
    private final UserRepository userRepository;
    private final JudgeService judgeService;
    private final SubmissionQueryService queryService;
    private final SubmissionPublisher publisher;
    private final TransactionTemplate tx;

    private record Job(String sourceCode, Long problemId) {}

    /** API side: record the submission, publish a job, return immediately. */
    public SubmissionResponse submit(Long userId, SubmitRequest request) {
        Problem problem = problemRepository.findBySlug(request.problemSlug())
                .orElseThrow(() -> new ResourceNotFoundException("Problem not found"));

        long testCount = testCaseRepository.countByProblemId(problem.getId());
        if (testCount == 0) {
            throw new ResourceNotFoundException("This problem has no test cases yet");
        }

        // The row is committed here, before anything is published
        Long submissionId = tx.execute(status -> {
            Submission s = Submission.builder()
                    .user(userRepository.getReferenceById(userId))
                    .problem(problemRepository.getReferenceById(problem.getId()))
                    .sourceCode(request.sourceCode())
                    .status(SubmissionStatus.QUEUED)
                    .totalCount((int) testCount)
                    .build();
            return submissionRepository.save(s).getId();
        });

        publisher.publishQuietly(submissionId);

        return queryService.get(submissionId, userId);
    }

    /** Worker side: called once per delivered message. Safe to call more than once for the same id. */
    public void process(Long submissionId) {
        Boolean claimed = tx.execute(status ->
                submissionRepository.claim(submissionId, LocalDateTime.now()) == 1);
        if (!Boolean.TRUE.equals(claimed)) {
            log.info("Submission {} is already claimed or finished; skipping", submissionId);
            return;
        }

        try {
            Job job = tx.execute(status -> {
                Submission s = submissionRepository.findById(submissionId).orElseThrow();
                return new Job(s.getSourceCode(), s.getProblem().getId());
            });

            List<TestCase> tests = testCaseRepository
                    .findByProblemIdOrderByOrderIndexAscIdAsc(job.problemId());
            if (tests.isEmpty()) {
                markFailed(submissionId, "Problem has no test cases");
                return;
            }

            // No transaction open while user code runs
            JudgeResult result = judgeService.judge(job.sourceCode(), tests, true);
            saveResult(submissionId, result, tests);

        } catch (RuntimeException e) {
            log.error("Processing failed for submission {}; releasing it for retry", submissionId, e);
            tx.executeWithoutResult(status -> submissionRepository.release(submissionId));
            throw e;   // the listener's retry policy takes over
        }
    }

    /** Terminal failure: called when retries are exhausted (dead-letter queue). */
    public void markFailed(Long submissionId, String message) {
        tx.executeWithoutResult(status ->
                submissionRepository.findById(submissionId).ifPresent(s -> {
                    if (s.getStatus() == SubmissionStatus.QUEUED
                            || s.getStatus() == SubmissionStatus.RUNNING) {
                        s.setStatus(SubmissionStatus.SYSTEM_ERROR);
                        s.setMessage(message);
                        s.setFinishedAt(LocalDateTime.now());
                    }
                }));
    }

    private void saveResult(Long submissionId, JudgeResult result, List<TestCase> tests) {
        tx.executeWithoutResult(status -> {
            Submission s = submissionRepository.findById(submissionId).orElseThrow();

            // Idempotent: a re-processed submission replaces its old results
            resultRepository.deleteBySubmissionId(submissionId);

            List<SubmissionTestResult> rows = new ArrayList<>();
            long maxTimeMs = 0;

            for (CaseResult c : result.cases()) {
                TestCase test = tests.get(c.index() - 1);
                boolean sample = test.isSample();

                rows.add(SubmissionTestResult.builder()
                        .submission(s)
                        .testCaseId(test.getId())
                        .orderIndex(c.index())
                        .sample(sample)
                        .status(c.status())
                        .executionTimeMs(c.timeMs())
                        .input(sample ? c.input() : null)
                        .expectedOutput(sample ? c.expectedOutput() : null)
                        .actualOutput(sample ? truncate(c.actualOutput()) : null)
                        .errorOutput(sample ? truncate(c.errorOutput()) : null)
                        .build());

                maxTimeMs = Math.max(maxTimeMs, c.timeMs());
            }
            resultRepository.saveAll(rows);

            s.setStatus(result.status());
            s.setMessage(truncate(result.message()));
            s.setPassedCount(result.passed());
            s.setTotalCount(result.total());
            s.setExecutionTimeMs(maxTimeMs);
            s.setFinishedAt(LocalDateTime.now());
        });
    }

    private static String truncate(String text) {
        if (text == null || text.length() <= MAX_STORED_CHARS) {
            return text;
        }
        return text.substring(0, MAX_STORED_CHARS) + "... [truncated]";
    }
}