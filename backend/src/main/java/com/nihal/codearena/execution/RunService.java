package com.nihal.codearena.execution;

import com.nihal.codearena.common.exception.ResourceNotFoundException;
import com.nihal.codearena.problem.entity.Problem;
import com.nihal.codearena.problem.repository.ProblemRepository;
import com.nihal.codearena.testcase.entity.TestCase;
import com.nihal.codearena.testcase.repository.TestCaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RunService {

    private final ProblemRepository problemRepository;
    private final TestCaseRepository testCaseRepository;
    private final JudgeService judgeService;

    // Deliberately NOT @Transactional: never hold a DB connection while user code runs
    public RunResponse runSamples(String slug, String sourceCode) {
        Problem problem = problemRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Problem not found"));

        List<TestCase> samples = testCaseRepository
                .findByProblemIdAndSampleTrueOrderByOrderIndexAscIdAsc(problem.getId());
        if (samples.isEmpty()) {
            throw new ResourceNotFoundException("This problem has no sample test cases");
        }

        return RunResponse.from(judgeService.judge(sourceCode, samples, false));
    }
}