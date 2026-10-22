package com.nihal.codearena.submission.service;

import com.nihal.codearena.auth.repository.UserRepository;
import com.nihal.codearena.common.exception.ResourceNotFoundException;
import com.nihal.codearena.execution.JudgeResult;
import com.nihal.codearena.execution.JudgeResult.CaseResult;
import com.nihal.codearena.execution.JudgeService;
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
    private final TransactionTemplate tx;

    // Deliberately NOT @Transactional: each step below opens its own short transaction
    public SubmissionResponse submit(Long userId, SubmitRequest request) {
        Problem problem = problemRepository.findBySlug(request.problemSlug())
                .orElseThrow(() -> new ResourceNotFoundException("Problem not found"));

        List<TestCase> tests = testCaseRepository
                .findByProblemIdOrderByOrderIndexAscIdAsc(problem.getId());
        if (tests.isEmpty()) {
            throw new ResourceNotFoundException("This problem has no test cases yet");
        }

        // Transaction 1: record the submission as QUEUED
        Long submissionId = tx.execute(status -> {
            Submission s = Submission.builder()
                    .user(userRepository.getReferenceById(userId))
                    .problem(problemRepository.getReferenceById(problem.getId()))
                    .sourceCode(request.sourceCode())
                    .status(SubmissionStatus.QUEUED)
                    .totalCount(tests.size())
                    .build();
            return submissionRepository.save(s).getId();
        });

        // Transaction 2: mark it RUNNING
        tx.executeWithoutResult(status -> {
            Submission s = submissionRepository.findById(submissionId).orElseThrow();
            s.setStatus(SubmissionStatus.RUNNING);
        });

        // No transaction here: user code runs without holding a DB connection
        JudgeResult result;
        try {
            result = judgeService.judge(request.sourceCode(), tests, true);
        } catch (RuntimeException e) {
            log.error("Judging crashed for submission {}", submissionId, e);
            result = new JudgeResult(SubmissionStatus.SYSTEM_ERROR, "Judging failed",
                    0, tests.size(), List.of());
        }

        // Transaction 3: store results and the final verdict
        saveResult(submissionId, result, tests);

        return queryService.get(submissionId, userId);
    }

    private void saveResult(Long submissionId, JudgeResult result, List<TestCase> tests) {
        tx.executeWithoutResult(status -> {
            Submission s = submissionRepository.findById(submissionId).orElseThrow();

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
                        // Hidden cases: store nothing but verdict and time
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