package com.nihal.codearena.execution;

import com.nihal.codearena.execution.JudgeResult.CaseResult;
import com.nihal.codearena.submission.entity.SubmissionStatus;
import com.nihal.codearena.testcase.entity.TestCase;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class JudgeService {

    private final CodeExecutor executor;

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
                    if (stopOnFirstFailure) {
                        break;
                    }
                }
            }
            return new JudgeResult(overall, null, passed, tests.size(), results);

        } catch (ExecutionFailedException e) {
            log.error("Execution infrastructure failure", e);
            return new JudgeResult(SubmissionStatus.SYSTEM_ERROR,
                    "Execution failed", 0, tests.size(), List.of());
        }
    }

    private CaseResult evaluate(int index, TestCase test, RunResult run) {
        SubmissionStatus status;
        if (run.timedOut()) {
            status = SubmissionStatus.TIME_LIMIT_EXCEEDED;
        } else if (run.outputLimitExceeded() || run.exitCode() != 0) {
            status = SubmissionStatus.RUNTIME_ERROR;
        } else if (sameOutput(run.stdout(), test.getExpectedOutput())) {
            status = SubmissionStatus.ACCEPTED;
        } else {
            status = SubmissionStatus.WRONG_ANSWER;
        }
        return new CaseResult(index, status, test.getInput(), test.getExpectedOutput(),
                run.stdout(), run.stderr(), run.durationMs());
    }

    static boolean sameOutput(String actual, String expected) {
        return normalize(actual).equals(normalize(expected));
    }

    // Ignore \r\n vs \n, trailing spaces on each line, and trailing blank lines
    private static String normalize(String text) {
        return Arrays.stream(text.replace("\r\n", "\n").split("\n", -1))
                .map(String::stripTrailing)
                .collect(Collectors.joining("\n"))
                .stripTrailing();
    }
}