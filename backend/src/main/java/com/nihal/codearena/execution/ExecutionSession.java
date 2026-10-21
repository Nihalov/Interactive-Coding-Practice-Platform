package com.nihal.codearena.execution;

public interface ExecutionSession extends AutoCloseable {

    boolean isCompiled();

    String compilerOutput();

    RunResult run(String stdin);

    @Override
    void close();
}