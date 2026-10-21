package com.nihal.codearena.testcase.dto;

public record TestCaseResponse(
        Long id,
        String input,
        String expectedOutput,
        boolean sample,
        int orderIndex
) {}