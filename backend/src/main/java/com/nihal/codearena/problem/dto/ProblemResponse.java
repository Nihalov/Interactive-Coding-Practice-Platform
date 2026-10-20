package com.nihal.codearena.problem.dto;

import com.nihal.codearena.problem.entity.Difficulty;

import java.time.LocalDateTime;

public record ProblemResponse(
        Long id,
        String title,
        String slug,
        String description,
        Difficulty difficulty,
        LocalDateTime createdAt
) {}