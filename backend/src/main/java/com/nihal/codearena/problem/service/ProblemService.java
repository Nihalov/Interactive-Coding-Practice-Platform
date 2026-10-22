package com.nihal.codearena.problem.service;

import com.nihal.codearena.common.exception.DuplicateResourceException;
import com.nihal.codearena.common.exception.ResourceNotFoundException;
import com.nihal.codearena.common.response.PageResponse;
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

    @Transactional(readOnly = true)
    public PageResponse<ProblemSummaryResponse> list(Difficulty difficulty, Pageable pageable) {
        Page<Problem> page = (difficulty == null)
                ? problemRepository.findAll(pageable)
                : problemRepository.findByDifficulty(difficulty, pageable);
        return PageResponse.from(page.map(this::toSummary));
    }

    @Transactional(readOnly = true)
    public ProblemResponse getBySlug(String slug) {
        Problem problem = problemRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Problem not found"));
        return toResponse(problem);
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

        return toResponse(problemRepository.save(problem));
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

        return toResponse(problem);
    }

    @Transactional
    public void delete(Long id) {
        if (!problemRepository.existsById(id)) {
            throw new ResourceNotFoundException("Problem not found");
        }
        if (submissionRepository.existsByProblemId(id)) {
            throw new DuplicateResourceException("Cannot delete a problem that already has submissions");
        }
        testCaseRepository.deleteByProblemId(id);
        problemRepository.deleteById(id);
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