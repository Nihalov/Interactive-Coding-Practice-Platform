package com.nihal.codearena.execution;

import com.nihal.codearena.execution.JudgeResult.CaseResult;
import com.nihal.codearena.submission.entity.SubmissionStatus;
import com.nihal.codearena.testcase.entity.TestCase;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class JudgeService {

    private final CodeExecutor executor;

    /** Throws ExecutionFailedException if the execution infrastructure fails (the caller decides about retries). */
    public JudgeResult judge(String sourceCode, List<TestCase> tests, boolean stopOnFirstFailure) {
        try (ExecutionSession session = executor.open(sourceCode)) {

            if (!session.isCompiled()) {
                return new JudgeResult(SubmissionStatus.COMPILATION_ERROR,
                        session.compilerOutput(), 0, tests.size(), List.of());
            }

            List<CaseResult> results = new ArrayList<>();
            SubmissionStatus overall = SubmissionStatus.ACCEPTED;
            int passed = 0;

            for (int i = 0; i < tests.size(); i++) {
                TestCase test = tests.get(i);
                RunResult run = session.run(test.getInput());
                CaseResult result = evaluate(i + 1, test, run);
                results.add(result);

                if (result.status() == SubmissionStatus.ACCEPTED) {
                    passed++;
                } else {
                    if (overall == SubmissionStatus.ACCEPTED) {
                        overall = result.status();
                    }
                    // After a timeout or output overflow the sandbox has been destroyed
                    boolean sandboxLost = run.timedOut() || run.outputLimitExceeded();
                    if (stopOnFirstFailure || sandboxLost) {
                        break;
                    }
                }
            }
            return new JudgeResult(overall, null, passed, tests.size(), results);
        }
    }

    private CaseResult evaluate(int index, TestCase test, RunResult run) {
        SubmissionStatus status;
        if (run.timedOut()) {
            status = SubmissionStatus.TIME_LIMIT_EXCEEDED;
        } else if (run.outputLimitExceeded()) {
            status = SubmissionStatus.RUNTIME_ERROR;
        } else if (run.exitCode() != 0) {
            status = isOutOfMemory(run)
                    ? SubmissionStatus.MEMORY_LIMIT_EXCEEDED
                    : SubmissionStatus.RUNTIME_ERROR;
        } else if (sameOutput(run.stdout(), test.getExpectedOutput())) {
            status = SubmissionStatus.ACCEPTED;
        } else {
            status = SubmissionStatus.WRONG_ANSWER;
        }
        return new CaseResult(index, status, test.getInput(), test.getExpectedOutput(),
                run.stdout(), run.stderr(), run.durationMs());
    }

    // 137 = killed by the kernel's out-of-memory killer; the JVM message covers the -Xmx heap limit
    private static boolean isOutOfMemory(RunResult run) {
        return run.exitCode() == 137 || run.stderr().contains("OutOfMemoryError");
    }

    static boolean sameOutput(String actual, String expected) {
        return normalize(actual).equals(normalize(expected));
    }

    private static String normalize(String text) {
        return Arrays.stream(text.replace("\r\n", "\n").split("\n", -1))
                .map(String::stripTrailing)
                .collect(Collectors.joining("\n"))
                .stripTrailing();
    }
}