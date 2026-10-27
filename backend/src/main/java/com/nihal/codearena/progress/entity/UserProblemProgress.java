package com.nihal.codearena.progress.entity;

import com.nihal.codearena.auth.entity.User;
import com.nihal.codearena.problem.entity.Problem;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "user_problem_progress",
        uniqueConstraints = @UniqueConstraint(name = "uk_progress_user_problem",
                columnNames = {"user_id", "problem_id"}),
        indexes = @Index(name = "idx_progress_user_solved", columnList = "user_id, solved"))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class UserProblemProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "problem_id", nullable = false)
    private Problem problem;

    @Column(nullable = false)
    private boolean solved;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "best_submission_id")
    private Long bestSubmissionId;

    @Column(name = "best_time_ms")
    private Long bestTimeMs;

    @Column(name = "first_solved_at")
    private LocalDateTime firstSolvedAt;

    @Column(name = "last_attempt_at")
    private LocalDateTime lastAttemptAt;
}