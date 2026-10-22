package com.nihal.codearena.submission.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record SubmitRequest(
        @NotBlank String problemSlug,
        @NotBlank @Size(max = 50000) String sourceCode
) {}