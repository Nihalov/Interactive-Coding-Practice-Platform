package com.nihal.codearena.submission.dto;

import com.nihal.codearena.submission.entity.SubmissionStatus;

public record CaseView(
        int index,
        SubmissionStatus status,
        boolean sample,
        long timeMs,
        String input,
        String expectedOutput,
        String actualOutput,
        String errorOutput
) {}