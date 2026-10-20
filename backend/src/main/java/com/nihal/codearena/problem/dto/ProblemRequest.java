package com.nihal.codearena.problem.dto;

import com.nihal.codearena.problem.entity.Difficulty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ProblemRequest(
        @NotBlank
        @Size(max = 150)
        @Pattern(regexp = ".*[A-Za-z0-9].*", message = "Title must contain letters or numbers")
        String title,

        @NotBlank String description,

        @NotNull Difficulty difficulty
) {}