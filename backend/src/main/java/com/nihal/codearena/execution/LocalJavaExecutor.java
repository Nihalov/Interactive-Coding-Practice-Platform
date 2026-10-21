package com.nihal.codearena.execution;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.util.FileSystemUtils;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
public class LocalJavaExecutor implements CodeExecutor {

    private final long timeLimitMs;
    private final long compileTimeoutMs;
    private final int maxOutputBytes;

    public LocalJavaExecutor(@Value("${app.runner.time-limit-ms}") long timeLimitMs,
                             @Value("${app.runner.compile-timeout-ms}") long compileTimeoutMs,
                             @Value("${app.runner.max-output-bytes}") int maxOutputBytes) {
        this.timeLimitMs = timeLimitMs;
        this.compileTimeoutMs = compileTimeoutMs;
        this.maxOutputBytes = maxOutputBytes;
    }

    @Override
    public ExecutionSession open(String sourceCode) {
        Path dir = null;
        try {
            dir = Files.createTempDirectory("submission-");
            Files.writeString(dir.resolve("Solution.java"), sourceCode, StandardCharsets.UTF_8);
            LocalSession session = new LocalSession(dir);
            session.compile();
            return session;
        } catch (IOException e) {
            deleteQuietly(dir);
            throw new ExecutionFailedException("Could not prepare or compile submission", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            deleteQuietly(dir);
            throw new ExecutionFailedException("Interrupted while compiling", e);
        }
    }

    private static String javaTool(String name) {
        return Path.of(System.getProperty("java.home"), "bin", name).toString();
    }

    private void deleteQuietly(Path dir) {
        if (dir == null) {
            return;
        }
        try {
            FileSystemUtils.deleteRecursively(dir);
        } catch (IOException e) {
            log.warn("Could not delete temp directory {}", dir, e);
        }
    }

    private String readCapped(Path file) throws IOException {
        try (InputStream in = Files.newInputStream(file)) {
            return new String(in.readNBytes(maxOutputBytes), StandardCharsets.UTF_8);
        }
    }

    private final class LocalSession implements ExecutionSession {

        private final Path dir;
        private boolean compiled;
        private String compilerOutput = "";

        LocalSession(Path dir) {
            this.dir = dir;
        }

        void compile() throws IOException, InterruptedException {
            Path out = dir.resolve("compile.txt");
            Process process = new ProcessBuilder(javaTool("javac"), "-encoding", "UTF-8", "Solution.java")
                    .directory(dir.toFile())
                    .redirectErrorStream(true)
                    .redirectOutput(out.toFile())
                    .start();

            if (!process.waitFor(compileTimeoutMs, TimeUnit.MILLISECONDS)) {
                process.destroyForcibly();
                compiled = false;
                compilerOutput = "Compilation timed out";
                return;
            }
            compiled = process.exitValue() == 0;
            compilerOutput = readCapped(out);
        }

        @Override
        public boolean isCompiled() {
            return compiled;
        }

        @Override
        public String compilerOutput() {
            return compilerOutput;
        }

        @Override
        public RunResult run(String stdin) {
            try {
                Path in = dir.resolve("input.txt");
                Path out = dir.resolve("stdout.txt");
                Path err = dir.resolve("stderr.txt");
                Files.writeString(in, stdin, StandardCharsets.UTF_8);

                Process process = new ProcessBuilder(
                        javaTool("java"), "-Xmx256m", "-XX:+UseSerialGC", "-cp", ".", "Solution")
                        .directory(dir.toFile())
                        .redirectInput(in.toFile())
                        .redirectOutput(out.toFile())
                        .redirectError(err.toFile())
                        .start();

                long start = System.nanoTime();
                long deadline = start + TimeUnit.MILLISECONDS.toNanos(timeLimitMs);
                boolean timedOut = false;
                boolean outputExceeded = false;

                // Poll every 20 ms: check the clock and the output size
                while (!process.waitFor(20, TimeUnit.MILLISECONDS)) {
                    if (System.nanoTime() > deadline) {
                        timedOut = true;
                        break;
                    }
                    if (Files.size(out) > maxOutputBytes || Files.size(err) > maxOutputBytes) {
                        outputExceeded = true;
                        break;
                    }
                }

                if (timedOut || outputExceeded) {
                    process.destroyForcibly();
                    process.waitFor();
                } else if (Files.size(out) > maxOutputBytes) {
                    outputExceeded = true;
                }

                long elapsedMs = (System.nanoTime() - start) / 1_000_000;
                int exitCode = (timedOut || outputExceeded) ? -1 : process.exitValue();

                return new RunResult(readCapped(out), readCapped(err),
                        exitCode, timedOut, outputExceeded, elapsedMs);

            } catch (IOException e) {
                throw new ExecutionFailedException("Failed to run submission", e);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new ExecutionFailedException("Interrupted while running submission", e);
            }
        }

        @Override
        public void close() {
            deleteQuietly(dir);
        }
    }
}