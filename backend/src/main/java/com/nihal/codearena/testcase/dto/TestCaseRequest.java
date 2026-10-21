package com.nihal.codearena.testcase.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record TestCaseRequest(
        @NotNull @Size(max = 100000) String input,
        @NotNull @Size(max = 100000) String expectedOutput,
        boolean sample
) {}