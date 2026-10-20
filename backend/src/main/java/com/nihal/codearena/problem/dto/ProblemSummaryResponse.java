package com.nihal.codearena.problem.dto;

import com.nihal.codearena.problem.entity.Difficulty;

public record ProblemSummaryResponse(
        Long id,
        String title,
        String slug,
        Difficulty difficulty
) {}