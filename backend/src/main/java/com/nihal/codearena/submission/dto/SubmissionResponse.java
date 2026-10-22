package com.nihal.codearena.submission.dto;

import com.nihal.codearena.submission.entity.SubmissionStatus;

import java.time.LocalDateTime;
import java.util.List;

public record SubmissionResponse(
        Long id,
        String problemSlug,
        String problemTitle,
        SubmissionStatus status,
        String message,
        int passedCount,
        int totalCount,
        Long executionTimeMs,
        LocalDateTime submittedAt,
        String sourceCode,
        List<CaseView> cases
) {}