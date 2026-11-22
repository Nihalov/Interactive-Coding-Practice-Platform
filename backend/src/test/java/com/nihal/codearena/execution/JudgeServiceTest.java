package com.nihal.codearena.execution;

import com.nihal.codearena.submission.entity.SubmissionStatus;
import com.nihal.codearena.testcase.entity.TestCase;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;

class JudgeServiceTest {

    @Test
    void compilationFailureReturnsDiagnosticsWithoutRunningTestsAndClosesSession() {
        StubSession session = new StubSession();
        session.compiled = false;
        session.compilerOutput = "Solution.java: missing semicolon";

        JudgeResult result = judge(session, tests(2), true);

        assertEquals(SubmissionStatus.COMPILATION_ERROR, result.status());
        assertEquals(session.compilerOutput, result.message());
        assertEquals(0, result.passed());
        assertEquals(2, result.total());
        assertTrue(result.cases().isEmpty());
        assertTrue(session.inputs.isEmpty());
        assertTrue(session.closed);
    }

    @Test
    void acceptedSubmissionRunsCasesInOrderAndPreservesCaseDiagnostics() {
        StubSession session = new StubSession(run("answer\n"), run("answer  \r\n"));

        JudgeResult result = judge(session, tests(2), true);

        assertEquals(SubmissionStatus.ACCEPTED, result.status());
        assertEquals(2, result.passed());
        assertEquals(2, result.total());
        assertEquals(List.of("input-1", "input-2"), session.inputs);
        assertEquals(1, result.cases().getFirst().index());
        assertEquals(2, result.cases().getLast().index());
        assertEquals("input-1", result.cases().getFirst().input());
        assertEquals("answer", result.cases().getFirst().expectedOutput());
        assertEquals("answer\n", result.cases().getFirst().actualOutput());
        assertEquals(12, result.cases().getFirst().timeMs());
        assertTrue(session.closed);
    }

    @Test
    void submissionsStopAtFirstFailureButKeepFullTestCount() {
        StubSession session = new StubSession(run("answer"), run("wrong"), run("answer"));

        JudgeResult result = judge(session, tests(3), true);

        assertEquals(SubmissionStatus.WRONG_ANSWER, result.status());
        assertEquals(1, result.passed());
        assertEquals(3, result.total());
        assertEquals(2, result.cases().size());
        assertEquals(List.of("input-1", "input-2"), session.inputs);
    }

    @Test
    void sampleRunsContinueAfterFailuresAndKeepFirstFailureAsOverallVerdict() {
        StubSession session = new StubSession(run("wrong"), run("answer"),
                new RunResult("", "exception", 1, false, false, 10));

        JudgeResult result = judge(session, tests(3), false);

        assertEquals(SubmissionStatus.WRONG_ANSWER, result.status());
        assertEquals(1, result.passed());
        assertEquals(3, result.cases().size());
        assertEquals(SubmissionStatus.RUNTIME_ERROR, result.cases().getLast().status());
        assertEquals("exception", result.cases().getLast().errorOutput());
    }

    @ParameterizedTest
    @MethodSource("verdicts")
    void executionFailuresReceiveExpectedVerdicts(RunResult run, SubmissionStatus expected) {
        JudgeResult result = judge(new StubSession(run), tests(1), true);
        assertEquals(expected, result.status());
        assertEquals(expected, result.cases().getFirst().status());
        assertEquals(0, result.passed());
    }

    static Stream<Arguments> verdicts() {
        return Stream.of(
                Arguments.of(new RunResult("", "", -1, true, false, 4000), SubmissionStatus.TIME_LIMIT_EXCEEDED),
                Arguments.of(new RunResult("", "", -1, false, true, 10), SubmissionStatus.RUNTIME_ERROR),
                Arguments.of(new RunResult("", "exception", 1, false, false, 10), SubmissionStatus.RUNTIME_ERROR),
                Arguments.of(new RunResult("", "", 137, false, false, 10), SubmissionStatus.MEMORY_LIMIT_EXCEEDED),
                Arguments.of(new RunResult("", "java.lang.OutOfMemoryError: heap", 1, false, false, 10), SubmissionStatus.MEMORY_LIMIT_EXCEEDED),
                Arguments.of(run("wrong answer"), SubmissionStatus.WRONG_ANSWER)
        );
    }

    @ParameterizedTest
    @MethodSource("destroyedSandboxes")
    void evenSampleRunsStopWhenSandboxHasBeenDestroyed(RunResult failedRun) {
        StubSession session = new StubSession(failedRun, run("answer"));
        JudgeResult result = judge(session, tests(2), false);
        assertEquals(1, result.cases().size());
        assertEquals(2, result.total());
        assertEquals(List.of("input-1"), session.inputs);
        assertTrue(session.closed);
    }

    static Stream<RunResult> destroyedSandboxes() {
        return Stream.of(new RunResult("", "", -1, true, false, 4000),
                new RunResult("", "", -1, false, true, 10));
    }

    @Test
    void infrastructureFailuresPropagateForWorkerRetriesAndStillCloseSession() {
        StubSession session = new StubSession();
        session.failure = new ExecutionFailedException("Docker unavailable", null);

        assertSame(session.failure, assertThrows(ExecutionFailedException.class,
                () -> judge(session, tests(1), true)));
        assertTrue(session.closed);
    }

    @Test
    void failureToOpenSandboxPropagatesWithoutBeingReportedAsUserCodeFailure() {
        ExecutionFailedException failure = new ExecutionFailedException("Cannot start container", null);
        JudgeService service = new JudgeService(source -> { throw failure; });
        assertSame(failure, assertThrows(ExecutionFailedException.class,
                () -> service.judge("source", tests(1), true)));
    }

    @ParameterizedTest
    @MethodSource("outputComparisons")
    void outputComparisonToleratesOnlyDocumentedWhitespaceDifferences(String actual, String expected, boolean matches) {
        assertEquals(matches, JudgeService.sameOutput(actual, expected));
    }

    static Stream<Arguments> outputComparisons() {
        return Stream.of(
                Arguments.of("a  \r\nb\t\r\n\r\n", "a\nb", true),
                Arguments.of("", "\n  \n", true),
                Arguments.of("hello world", "hello world", true),
                Arguments.of(" hello", "hello", false),
                Arguments.of("a  b", "a b", false),
                Arguments.of("a\n\nb", "a\nb", false),
                Arguments.of("Hello", "hello", false),
                Arguments.of("answer\nextra", "answer", false)
        );
    }

    private static JudgeResult judge(StubSession session, List<TestCase> tests, boolean stopOnFailure) {
        JudgeService service = new JudgeService(source -> {
            assertEquals("submitted source", source);
            return session;
        });
        return service.judge("submitted source", tests, stopOnFailure);
    }

    private static List<TestCase> tests(int count) {
        return java.util.stream.IntStream.rangeClosed(1, count)
                .mapToObj(i -> TestCase.builder().input("input-" + i).expectedOutput("answer").build())
                .toList();
    }

    private static RunResult run(String output) {
        return new RunResult(output, "", 0, false, false, 12);
    }

    /** A deterministic execution boundary; these tests never compile or execute submitted code. */
    private static class StubSession implements ExecutionSession {
        private final ArrayDeque<RunResult> results;
        private final List<String> inputs = new ArrayList<>();
        private boolean compiled = true;
        private String compilerOutput = "";
        private boolean closed;
        private ExecutionFailedException failure;

        StubSession(RunResult... results) {
            this.results = new ArrayDeque<>(List.of(results));
        }

        public boolean isCompiled() { return compiled; }
        public String compilerOutput() { return compilerOutput; }
        public RunResult run(String stdin) {
            inputs.add(stdin);
            if (failure != null) throw failure;
            return results.removeFirst();
        }
        public void close() { closed = true; }
    }
}
