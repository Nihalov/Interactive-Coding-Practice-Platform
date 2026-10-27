package com.nihal.codearena.submission.repository;

import com.nihal.codearena.submission.entity.Submission;
import com.nihal.codearena.submission.entity.SubmissionStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface SubmissionRepository extends JpaRepository<Submission, Long> {

    @EntityGraph(attributePaths = "problem")
    Optional<Submission> findByIdAndUserId(Long id, Long userId);

    @EntityGraph(attributePaths = "problem")
    Page<Submission> findByUserId(Long userId, Pageable pageable);

    @EntityGraph(attributePaths = "problem")
    Page<Submission> findByUserIdAndProblemSlug(Long userId, String slug, Pageable pageable);

    boolean existsByProblemId(Long problemId);

    // New in Step 12: used for the acceptance rate in /stats
    long countByUserIdAndStatus(Long userId, SubmissionStatus status);

    List<Submission> findTop50ByStatusAndSubmittedAtBefore(SubmissionStatus status, LocalDateTime before);

    List<Submission> findTop50ByStatusAndStartedAtBefore(SubmissionStatus status, LocalDateTime before);

    /** Atomic claim: returns 1 only for the single caller that moves QUEUED -> RUNNING. */
    @Modifying
    @Query("""
            update Submission s
               set s.status = com.nihal.codearena.submission.entity.SubmissionStatus.RUNNING,
                   s.startedAt = :now
             where s.id = :id
               and s.status = com.nihal.codearena.submission.entity.SubmissionStatus.QUEUED
            """)
    int claim(@Param("id") Long id, @Param("now") LocalDateTime now);

    /** Puts a RUNNING submission back to QUEUED (failure or crashed worker). */
    @Modifying
    @Query("""
            update Submission s
               set s.status = com.nihal.codearena.submission.entity.SubmissionStatus.QUEUED,
                   s.startedAt = null
             where s.id = :id
               and s.status = com.nihal.codearena.submission.entity.SubmissionStatus.RUNNING
            """)
    int release(@Param("id") Long id);
}