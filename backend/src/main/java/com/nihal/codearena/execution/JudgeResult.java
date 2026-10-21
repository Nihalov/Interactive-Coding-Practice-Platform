package com.nihal.codearena.execution;

import com.nihal.codearena.submission.entity.SubmissionStatus;

import java.util.List;

public record JudgeResult(
        SubmissionStatus status,
        String message,
        int passed,
        int total,
        List<CaseResult> cases
) {
    public record CaseResult(
            int index,
            SubmissionStatus status,
            String input,
            String expectedOutput,
            String actualOutput,
            String errorOutput,
            long timeMs
    ) {}
}