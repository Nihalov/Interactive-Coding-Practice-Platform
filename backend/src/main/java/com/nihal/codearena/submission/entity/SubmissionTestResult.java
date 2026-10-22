package com.nihal.codearena.submission.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "submission_test_results", indexes = {
        @Index(name = "idx_results_submission", columnList = "submission_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmissionTestResult {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "submission_id", nullable = false)
    private Submission submission;

    // Plain id, not a foreign key: editing or deleting a test case must not rewrite history
    @Column(name = "test_case_id", nullable = false)
    private Long testCaseId;

    @Column(name = "order_index", nullable = false)
    private int orderIndex;

    @Column(name = "is_sample", nullable = false)
    private boolean sample;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubmissionStatus status;

    @Column(name = "execution_time_ms", nullable = false)
    private long executionTimeMs;

    // The four fields below are filled ONLY for sample cases
    @Column(columnDefinition = "TEXT")
    private String input;

    @Column(name = "expected_output", columnDefinition = "TEXT")
    private String expectedOutput;

    @Column(name = "actual_output", columnDefinition = "TEXT")
    private String actualOutput;

    @Column(name = "error_output", columnDefinition = "TEXT")
    private String errorOutput;
}