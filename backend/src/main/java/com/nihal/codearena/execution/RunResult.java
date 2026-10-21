package com.nihal.codearena.execution;

public record RunResult(
        String stdout,
        String stderr,
        int exitCode,
        boolean timedOut,
        boolean outputLimitExceeded,
        long durationMs
) {}