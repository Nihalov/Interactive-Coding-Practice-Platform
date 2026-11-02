package com.nihal.codearena.problem.service;

import com.nihal.codearena.common.exception.DuplicateResourceException;
import com.nihal.codearena.common.exception.ResourceNotFoundException;
import com.nihal.codearena.common.response.PageResponse;
import com.nihal.codearena.problem.cache.ProblemCache;
import com.nihal.codearena.problem.dto.ProblemPageSnapshot;
import com.nihal.codearena.problem.dto.ProblemRequest;
import com.nihal.codearena.problem.dto.ProblemResponse;
import com.nihal.codearena.problem.dto.ProblemSummaryResponse;
import com.nihal.codearena.problem.entity.Difficulty;
import com.nihal.codearena.problem.entity.Problem;
import com.nihal.codearena.problem.repository.ProblemRepository;
import com.nihal.codearena.submission.repository.SubmissionRepository;
import com.nihal.codearena.testcase.repository.TestCaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class ProblemService {

    private final ProblemRepository problemRepository;
    private final TestCaseRepository testCaseRepository;
    private final SubmissionRepository submissionRepository;
    private final ProblemCache problemCache;

    // No @Transactional on the two reads: a cache hit must not touch the database at all.
    // The repository calls inside the loaders open their own short read transactions.

    public PageResponse<ProblemSummaryResponse> list(Difficulty difficulty, Pageable pageable) {
        String variant = (difficulty == null ? "ALL" : difficulty.name())
                + ":" + pageable.getPageNumber()
                + ":" + pageable.getPageSize()
                + ":" + pageable.getSort();

        return problemCache.list(variant, () -> {
            Page<Problem> page = (difficulty == null)
                    ? problemRepository.findAll(pageable)
                    : problemRepository.findByDifficulty(difficulty, pageable);
            return ProblemPageSnapshot.from(PageResponse.from(page.map(this::toSummary)));
        }).toPageResponse();
    }

    public ProblemResponse getBySlug(String slug) {
        return problemCache.detail(slug, () -> {
            Problem problem = problemRepository.findBySlug(slug)
                    .orElseThrow(() -> new ResourceNotFoundException("Problem not found"));
            return toResponse(problem);
        });
    }

    @Transactional
    public ProblemResponse create(ProblemRequest request) {
        String title = request.title().trim();
        String slug = toSlug(title);

        if (problemRepository.existsBySlug(slug)) {
            throw new DuplicateResourceException("A problem with this title already exists");
        }

        Problem problem = Problem.builder()
                .title(title)
                .slug(slug)
                .description(request.description())
                .difficulty(request.difficulty())
                .build();

        Problem saved = problemRepository.save(problem);
        problemCache.evictProblem(saved.getSlug());
        return toResponse(saved);
    }

    @Transactional
    public ProblemResponse update(Long id, ProblemRequest request) {
        Problem problem = problemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Problem not found"));

        String title = request.title().trim();
        if (problemRepository.existsByTitleAndIdNot(title, id)) {
            throw new DuplicateResourceException("A problem with this title already exists");
        }

        // The slug is deliberately NOT regenerated, so existing links keep working
        problem.setTitle(title);
        problem.setDescription(request.description());
        problem.setDifficulty(request.difficulty());

        problemCache.evictProblem(problem.getSlug());
        return toResponse(problem);
    }

    @Transactional
    public void delete(Long id) {
        Problem problem = problemRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Problem not found"));

        if (submissionRepository.existsByProblemId(id)) {
            throw new DuplicateResourceException("Cannot delete a problem that already has submissions");
        }

        testCaseRepository.deleteByProblemId(id);
        problemRepository.delete(problem);
        problemCache.evictProblem(problem.getSlug());
    }

    private static String toSlug(String title) {
        return title.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("(^-+|-+$)", "");
    }

    private ProblemResponse toResponse(Problem p) {
        return new ProblemResponse(p.getId(), p.getTitle(), p.getSlug(),
                p.getDescription(), p.getDifficulty(), p.getCreatedAt());
    }

    private ProblemSummaryResponse toSummary(Problem p) {
        return new ProblemSummaryResponse(p.getId(), p.getTitle(), p.getSlug(), p.getDifficulty());
    }
}