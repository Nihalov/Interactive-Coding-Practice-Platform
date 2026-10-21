package com.nihal.codearena.submission.entity;

public enum SubmissionStatus {
    QUEUED,
    RUNNING,
    ACCEPTED,
    WRONG_ANSWER,
    COMPILATION_ERROR,
    RUNTIME_ERROR,
    TIME_LIMIT_EXCEEDED,
    MEMORY_LIMIT_EXCEEDED,
    SYSTEM_ERROR
}