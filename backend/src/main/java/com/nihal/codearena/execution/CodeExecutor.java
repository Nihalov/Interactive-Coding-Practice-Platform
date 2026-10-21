package com.nihal.codearena.execution;

public interface CodeExecutor {
    /** Prepares an isolated environment, writes the source and compiles it. */
    ExecutionSession open(String sourceCode);
}