package com.nihal.codearena.progress.dto;

import com.nihal.codearena.problem.entity.Difficulty;

public record DifficultyStats(Difficulty difficulty, long solved, long total) {}