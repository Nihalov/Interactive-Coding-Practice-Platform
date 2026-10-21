package com.nihal.codearena.execution;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RunRequest(
        @NotBlank @Size(max = 50000) String sourceCode
) {}