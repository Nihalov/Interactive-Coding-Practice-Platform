package com.nihal.codearena.submission.repository;

import com.nihal.codearena.submission.entity.Submission;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {

    @EntityGraph(attributePaths = "problem")
    Optional<Submission> findByIdAndUserId(Long id, Long userId);

    @EntityGraph(attributePaths = "problem")
    Page<Submission> findByUserId(Long userId, Pageable pageable);

    @EntityGraph(attributePaths = "problem")
    Page<Submission> findByUserIdAndProblemSlug(Long userId, String slug, Pageable pageable);

    boolean existsByProblemId(Long problemId);
}