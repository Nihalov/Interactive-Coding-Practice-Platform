package com.nihal.codearena.progress.service;

import com.nihal.codearena.common.response.PageResponse;
import com.nihal.codearena.problem.entity.Difficulty;
import com.nihal.codearena.problem.entity.Problem;
import com.nihal.codearena.problem.repository.ProblemRepository;
import com.nihal.codearena.progress.dto.DifficultyCount;
import com.nihal.codearena.progress.dto.DifficultyStats;
import com.nihal.codearena.progress.dto.ProgressResponse;
import com.nihal.codearena.progress.dto.StatsResponse;
import com.nihal.codearena.progress.entity.UserProblemProgress;
import com.nihal.codearena.progress.repository.UserProblemProgressRepository;
import com.nihal.codearena.submission.entity.SubmissionStatus;
import com.nihal.codearena.submission.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ProgressService {

    private final UserProblemProgressRepository progressRepository;
    private final ProblemRepository problemRepository;
    private final SubmissionRepository submissionRepository;

    /**
     * Called from inside the transaction that saves a submission's final verdict,
     * so the verdict and the progress commit (or roll back) together.
     */
    @Transactional
    public void record(Long userId, Long problemId, Long submissionId,
                       SubmissionStatus status, long executionTimeMs, LocalDateTime finishedAt) {

        progressRepository.insertIfAbsent(userId, problemId);
        UserProblemProgress progress = progressRepository.findForUpdate(userId, problemId)
                .orElseThrow(() -> new IllegalStateException("Progress row missing after insert"));

        progress.setAttempts(progress.getAttempts() + 1);
        progress.setLastAttemptAt(finishedAt);

        if (status == SubmissionStatus.ACCEPTED) {
            if (!progress.isSolved()) {
                progress.setSolved(true);
                progress.setFirstSolvedAt(finishedAt);
            }
            if (progress.getBestTimeMs() == null || executionTimeMs < progress.getBestTimeMs()) {
                progress.setBestSubmissionId(submissionId);
                progress.setBestTimeMs(executionTimeMs);
            }
        }
    }

    @Transactional(readOnly = true)
    public PageResponse<ProgressResponse> list(Long userId, Pageable pageable) {
        return PageResponse.from(progressRepository.findByUserId(userId, pageable).map(this::toResponse));
    }

    @Transactional(readOnly = true)
    public StatsResponse stats(Long userId) {
        long judged = progressRepository.sumAttempts(userId);
        long accepted = submissionRepository.countByUserIdAndStatus(userId, SubmissionStatus.ACCEPTED);

        Map<Difficulty, Long> solvedBy = toMap(progressRepository.countSolvedByDifficulty(userId));
        Map<Difficulty, Long> totalBy = toMap(problemRepository.countGroupedByDifficulty());

        List<DifficultyStats> byDifficulty = Arrays.stream(Difficulty.values())
                .map(d -> new DifficultyStats(d, solvedBy.getOrDefault(d, 0L), totalBy.getOrDefault(d, 0L)))
                .toList();

        Double rate = judged == 0 ? null : Math.round(accepted * 1000.0 / judged) / 10.0;

        return new StatsResponse(
                problemRepository.count(),
                progressRepository.countByUserIdAndSolvedTrue(userId),
                progressRepository.countByUserId(userId),
                judged,
                accepted,
                rate,
                byDifficulty
        );
    }

    private static Map<Difficulty, Long> toMap(List<DifficultyCount> counts) {
        return counts.stream().collect(Collectors.toMap(DifficultyCount::difficulty, DifficultyCount::count));
    }

    private ProgressResponse toResponse(UserProblemProgress p) {
        Problem problem = p.getProblem();
        return new ProgressResponse(problem.getSlug(), problem.getTitle(), problem.getDifficulty(),
                p.isSolved(), p.getAttempts(), p.getBestSubmissionId(), p.getBestTimeMs(),
                p.getFirstSolvedAt(), p.getLastAttemptAt());
    }
}