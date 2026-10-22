package com.nihal.codearena.submission.dto;

import com.nihal.codearena.submission.entity.SubmissionStatus;

import java.time.LocalDateTime;

public record SubmissionSummaryResponse(
        Long id,
        String problemSlug,
        String problemTitle,
        SubmissionStatus status,
        int passedCount,
        int totalCount,
        Long executionTimeMs,
        LocalDateTime submittedAt
) {}