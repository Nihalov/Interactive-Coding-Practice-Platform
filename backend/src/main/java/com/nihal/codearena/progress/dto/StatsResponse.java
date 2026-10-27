package com.nihal.codearena.progress.dto;

import java.util.List;

public record StatsResponse(
        long totalProblems,
        long solvedCount,
        long attemptedCount,
        long judgedSubmissions,
        long acceptedSubmissions,
        Double acceptanceRate,
        List<DifficultyStats> byDifficulty
) {}