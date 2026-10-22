package com.nihal.codearena.submission.service;

import com.nihal.codearena.common.exception.ResourceNotFoundException;
import com.nihal.codearena.common.response.PageResponse;
import com.nihal.codearena.submission.dto.CaseView;
import com.nihal.codearena.submission.dto.SubmissionResponse;
import com.nihal.codearena.submission.dto.SubmissionSummaryResponse;
import com.nihal.codearena.submission.entity.Submission;
import com.nihal.codearena.submission.entity.SubmissionTestResult;
import com.nihal.codearena.submission.repository.SubmissionRepository;
import com.nihal.codearena.submission.repository.SubmissionTestResultRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class SubmissionQueryService {

    private final SubmissionRepository submissionRepository;
    private final SubmissionTestResultRepository resultRepository;

    @Transactional(readOnly = true)
    public SubmissionResponse get(Long submissionId, Long userId) {
        // Not found and "someone else's" look identical on purpose
        Submission s = submissionRepository.findByIdAndUserId(submissionId, userId)
                .orElseThrow(() -> new ResourceNotFoundException("Submission not found"));

        List<CaseView> cases = resultRepository
                .findBySubmissionIdOrderByOrderIndexAsc(submissionId)
                .stream()
                .map(this::toCaseView)
                .toList();

        return new SubmissionResponse(
                s.getId(),
                s.getProblem().getSlug(),
                s.getProblem().getTitle(),
                s.getStatus(),
                s.getMessage(),
                s.getPassedCount(),
                s.getTotalCount(),
                s.getExecutionTimeMs(),
                s.getSubmittedAt(),
                s.getSourceCode(),
                cases
        );
    }

    @Transactional(readOnly = true)
    public PageResponse<SubmissionSummaryResponse> history(Long userId, String problemSlug, Pageable pageable) {
        Page<Submission> page = (problemSlug == null)
                ? submissionRepository.findByUserId(userId, pageable)
                : submissionRepository.findByUserIdAndProblemSlug(userId, problemSlug, pageable);
        return PageResponse.from(page.map(this::toSummary));
    }

    private CaseView toCaseView(SubmissionTestResult r) {
        // Hidden cases: the stored fields are already null, so only verdict and time are shown
        return new CaseView(r.getOrderIndex(), r.getStatus(), r.isSample(), r.getExecutionTimeMs(),
                r.getInput(), r.getExpectedOutput(), r.getActualOutput(), r.getErrorOutput());
    }

    private SubmissionSummaryResponse toSummary(Submission s) {
        return new SubmissionSummaryResponse(s.getId(), s.getProblem().getSlug(), s.getProblem().getTitle(),
                s.getStatus(), s.getPassedCount(), s.getTotalCount(), s.getExecutionTimeMs(), s.getSubmittedAt());
    }
}