package com.nihal.codearena.execution;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.util.FileSystemUtils;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Slf4j
@Component
@ConditionalOnProperty(name = "app.runner.mode", havingValue = "docker")
public class DockerJavaExecutor implements CodeExecutor {

    private static final String LABEL = "codearena.sandbox=true";
    private static final long DOCKER_CALL_TIMEOUT_MS = 20_000;

    private final String docker;
    private final String image;
    private final String memory;
    private final String cpus;
    private final int pidsLimit;
    private final long timeLimitMs;
    private final long compileTimeoutMs;
    private final int maxOutputBytes;

    public DockerJavaExecutor(
            @Value("${app.runner.docker-binary:docker}") String docker,
            @Value("${app.runner.image}") String image,
            @Value("${app.runner.memory}") String memory,
            @Value("${app.runner.cpus}") String cpus,
            @Value("${app.runner.pids-limit}") int pidsLimit,
            @Value("${app.runner.time-limit-ms}") long timeLimitMs,
            @Value("${app.runner.compile-timeout-ms}") long compileTimeoutMs,
            @Value("${app.runner.max-output-bytes}") int maxOutputBytes) {
        this.docker = docker;
        this.image = image;
        this.memory = memory;
        this.cpus = cpus;
        this.pidsLimit = pidsLimit;
        this.timeLimitMs = timeLimitMs;
        this.compileTimeoutMs = compileTimeoutMs;
        this.maxOutputBytes = maxOutputBytes;
    }

    // ---------- startup checks and cleanup ----------

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        try {
            dockerCommand(DOCKER_CALL_TIMEOUT_MS, "image", "inspect", image);
        } catch (IOException e) {
            log.error("Sandbox is not ready ({}). Is Docker running? Did you run: docker pull {}", e.getMessage(), image);
            return;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return;
        }

        try {
            String ids = dockerCommand(DOCKER_CALL_TIMEOUT_MS, "ps", "-aq", "--filter", "label=" + LABEL);
            if (!ids.isBlank()) {
                List<String> args = new ArrayList<>(List.of("rm", "-f"));
                args.addAll(List.of(ids.split("\\s+")));
                dockerCommand(DOCKER_CALL_TIMEOUT_MS, args.toArray(String[]::new));
                log.warn("Removed leftover sandbox containers: {}", ids.replace('\n', ' '));
            }
        } catch (IOException e) {
            log.warn("Could not clean up leftover sandbox containers: {}", e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    // ---------- CodeExecutor ----------

    @Override
    public ExecutionSession open(String sourceCode) {
        Path root = null;
        String name = "sandbox-" + UUID.randomUUID();
        try {
            root = Files.createTempDirectory("submission-");
            // Only src/ is mounted into the container. Input/output files stay in root/.
            Path src = Files.createDirectory(root.resolve("src"));
            Files.writeString(src.resolve("Solution.java"), sourceCode, StandardCharsets.UTF_8);

            startContainer(name, src);
            DockerSession session = new DockerSession(root, name);
            session.compile();
            return session;
        } catch (IOException e) {
            cleanup(root, name);
            throw new ExecutionFailedException("Could not start or compile in the sandbox", e);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            cleanup(root, name);
            throw new ExecutionFailedException("Interrupted while preparing the sandbox", e);
        } catch (RuntimeException e) {
            cleanup(root, name);
            throw e;
        }
    }

    private void startContainer(String name, Path src) throws IOException, InterruptedException {
        dockerCommand(DOCKER_CALL_TIMEOUT_MS,
                "run", "-d",
                "--name", name,
                "--label", LABEL,
                "--network", "none",
                "--memory", memory,
                "--memory-swap", memory,
                "--cpus", cpus,
                "--pids-limit", String.valueOf(pidsLimit),
                "--read-only",
                "--tmpfs", "/tmp:rw,size=64m",
                "--cap-drop", "ALL",
                "--security-opt", "no-new-privileges",
                "--user", "65534:65534",
                "--workdir", "/tmp",
                "--mount", "type=bind,source=" + src.toAbsolutePath() + ",target=/workspace,readonly",
                image, "sleep", "infinity");
    }

    // ---------- docker helpers ----------

    /** Runs a short docker command, returns its trimmed output, throws IOException on failure. */
    private String dockerCommand(long timeoutMs, String... args) throws IOException, InterruptedException {
        List<String> command = new ArrayList<>();
        command.add(docker);
        command.addAll(List.of(args));

        Path out = Files.createTempFile("docker-", ".txt");
        try {
            Process process = new ProcessBuilder(command)
                    .redirectErrorStream(true)
                    .redirectOutput(out.toFile())
                    .start();
            if (!process.waitFor(timeoutMs, TimeUnit.MILLISECONDS)) {
                process.destroyForcibly();
                throw new IOException("docker " + args[0] + " timed out");
            }
            String text = Files.readString(out, StandardCharsets.UTF_8).trim();
            if (process.exitValue() != 0) {
                throw new IOException("docker " + args[0] + " failed: " + text);
            }
            return text;
        } finally {
            Files.deleteIfExists(out);
        }
    }

    private void killContainer(String name) {
        try {
            dockerCommand(DOCKER_CALL_TIMEOUT_MS, "kill", name);
        } catch (IOException e) {
            log.debug("kill {} ignored: {}", name, e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private void removeContainer(String name) {
        try {
            dockerCommand(DOCKER_CALL_TIMEOUT_MS, "rm", "-f", name);
        } catch (IOException e) {
            log.debug("rm {} ignored: {}", name, e.getMessage());
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    private void cleanup(Path root, String name) {
        removeContainer(name);
        deleteQuietly(root);
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

    // docker exec exit codes meaning "docker itself failed", not "the user's program failed"
    private static boolean isDockerFailure(int exitCode) {
        return exitCode == 125 || exitCode == 126 || exitCode == 127;
    }

    private record Proc(int exitCode, boolean timedOut, boolean outputExceeded, long elapsedMs) {}

    /** Runs a command on the host with a wall-clock deadline and an output-size cap. */
    private Proc runProcess(List<String> command, Path stdin, Path stdout, Path stderr, long timeoutMs)
            throws IOException, InterruptedException {

        ProcessBuilder builder = new ProcessBuilder(command)
                .redirectOutput(stdout.toFile())
                .redirectError(stderr.toFile());
        if (stdin != null) {
            builder.redirectInput(stdin.toFile());
        }
        Process process = builder.start();

        long start = System.nanoTime();
        long deadline = start + TimeUnit.MILLISECONDS.toNanos(timeoutMs);
        boolean timedOut = false;
        boolean exceeded = false;

        while (!process.waitFor(20, TimeUnit.MILLISECONDS)) {
            if (System.nanoTime() > deadline) {
                timedOut = true;
                break;
            }
            if (Files.size(stdout) > maxOutputBytes || Files.size(stderr) > maxOutputBytes) {
                exceeded = true;
                break;
            }
        }

        if (timedOut || exceeded) {
            process.destroyForcibly();
            process.waitFor();
        } else if (Files.size(stdout) > maxOutputBytes || Files.size(stderr) > maxOutputBytes) {
            exceeded = true;
        }

        long elapsedMs = (System.nanoTime() - start) / 1_000_000;
        int exit = (timedOut || exceeded) ? -1 : process.exitValue();
        return new Proc(exit, timedOut, exceeded, elapsedMs);
    }

    // ---------- the session ----------

    private final class DockerSession implements ExecutionSession {

        private final Path root;
        private final String name;
        private boolean compiled;
        private String compilerOutput = "";
        private boolean dead;

        DockerSession(Path root, String name) {
            this.root = root;
            this.name = name;
        }

        void compile() throws IOException, InterruptedException {
            Path out = root.resolve("compile-out.txt");
            Path err = root.resolve("compile-err.txt");

            Proc proc = runProcess(
                    List.of(docker, "exec", name,
                            "javac", "-encoding", "UTF-8", "-d", "/tmp", "/workspace/Solution.java"),
                    null, out, err, compileTimeoutMs);

            if (proc.timedOut() || proc.outputExceeded()) {
                killContainer(name);
                dead = true;
                compiled = false;
                compilerOutput = proc.timedOut() ? "Compilation timed out" : "Compiler output was too large";
                return;
            }

            String text = (readCapped(err) + readCapped(out)).trim();
            if (isDockerFailure(proc.exitCode())) {
                throw new ExecutionFailedException("docker exec failed during compilation: " + text, null);
            }
            compiled = proc.exitCode() == 0;
            compilerOutput = text;
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
            if (dead) {
                throw new ExecutionFailedException("The sandbox is no longer available", null);
            }
            try {
                Path in = root.resolve("input.txt");
                Path out = root.resolve("stdout.txt");
                Path err = root.resolve("stderr.txt");
                Files.writeString(in, stdin, StandardCharsets.UTF_8);

                Proc proc = runProcess(
                        List.of(docker, "exec", "-i", name,
                                "java", "-Xmx256m", "-XX:+UseSerialGC", "-XX:TieredStopAtLevel=1",
                                "-XX:-UsePerfData", "-cp", "/tmp", "Solution"),
                        in, out, err, timeLimitMs);

                if (proc.timedOut() || proc.outputExceeded()) {
                    // Killing only the docker client would leave the user's program running
                    // inside the container, so the whole container is killed.
                    killContainer(name);
                    dead = true;
                } else if (isDockerFailure(proc.exitCode())) {
                    throw new ExecutionFailedException(
                            "docker exec failed: " + readCapped(err).trim(), null);
                }

                return new RunResult(readCapped(out), readCapped(err), proc.exitCode(),
                        proc.timedOut(), proc.outputExceeded(), proc.elapsedMs());

            } catch (IOException e) {
                throw new ExecutionFailedException("Failed to run submission in the sandbox", e);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                throw new ExecutionFailedException("Interrupted while running submission", e);
            }
        }

        @Override
        public void close() {
            cleanup(root, name);
        }
    }
}