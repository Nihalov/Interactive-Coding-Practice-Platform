package com.nihal.codearena.execution;

import com.nihal.codearena.execution.JudgeResult.CaseResult;
import com.nihal.codearena.submission.entity.SubmissionStatus;

import java.util.List;

public record RunResponse(
        SubmissionStatus status,
        String message,
        int passed,
        int total,
        List<CaseResult> cases
) {
    public static RunResponse from(JudgeResult r) {
        return new RunResponse(r.status(), r.message(), r.passed(), r.total(), r.cases());
    }
}