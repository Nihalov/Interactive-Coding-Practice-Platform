package com.nihal.codearena.progress.dto;

import com.nihal.codearena.problem.entity.Difficulty;

import java.time.LocalDateTime;

public record ProgressResponse(
        String problemSlug,
        String problemTitle,
        Difficulty difficulty,
        boolean solved,
        int attempts,
        Long bestSubmissionId,
        Long bestTimeMs,
        LocalDateTime firstSolvedAt,
        LocalDateTime lastAttemptAt
) {}