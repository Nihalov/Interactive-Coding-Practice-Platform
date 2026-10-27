package com.nihal.codearena.progress.dto;

import com.nihal.codearena.problem.entity.Difficulty;

public record DifficultyCount(Difficulty difficulty, long count) {}