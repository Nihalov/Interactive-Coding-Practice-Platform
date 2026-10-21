package com.nihal.codearena.execution;

public class ExecutionFailedException extends RuntimeException {
    public ExecutionFailedException(String message, Throwable cause) {
        super(message, cause);
    }
}