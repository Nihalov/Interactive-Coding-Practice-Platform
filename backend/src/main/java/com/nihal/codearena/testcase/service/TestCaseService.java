package com.nihal.codearena.testcase.service;

import com.nihal.codearena.common.exception.ResourceNotFoundException;
import com.nihal.codearena.problem.entity.Problem;
import com.nihal.codearena.problem.repository.ProblemRepository;
import com.nihal.codearena.testcase.dto.SampleTestCaseResponse;
import com.nihal.codearena.testcase.dto.TestCaseRequest;
import com.nihal.codearena.testcase.dto.TestCaseResponse;
import com.nihal.codearena.testcase.entity.TestCase;
import com.nihal.codearena.testcase.repository.TestCaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class TestCaseService {

    private final TestCaseRepository testCaseRepository;
    private final ProblemRepository problemRepository;

    @Transactional(readOnly = true)
    public List<SampleTestCaseResponse> getSamples(String slug) {
        Problem problem = problemRepository.findBySlug(slug)
                .orElseThrow(() -> new ResourceNotFoundException("Problem not found"));

        return testCaseRepository
                .findByProblemIdAndSampleTrueOrderByOrderIndexAscIdAsc(problem.getId())
                .stream()
                .map(t -> new SampleTestCaseResponse(t.getInput(), t.getExpectedOutput()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TestCaseResponse> listAll(Long problemId) {
        ensureProblemExists(problemId);
        return testCaseRepository.findByProblemIdOrderByOrderIndexAscIdAsc(problemId)
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public TestCaseResponse create(Long problemId, TestCaseRequest request) {
        Problem problem = problemRepository.findById(problemId)
                .orElseThrow(() -> new ResourceNotFoundException("Problem not found"));

        TestCase testCase = TestCase.builder()
                .problem(problem)
                .input(request.input())
                .expectedOutput(request.expectedOutput())
                .sample(request.sample())
                .orderIndex(testCaseRepository.findMaxOrderIndex(problemId) + 1)
                .build();

        return toResponse(testCaseRepository.save(testCase));
    }

    @Transactional
    public TestCaseResponse update(Long problemId, Long testCaseId, TestCaseRequest request) {
        TestCase testCase = testCaseRepository.findByIdAndProblemId(testCaseId, problemId)
                .orElseThrow(() -> new ResourceNotFoundException("Test case not found"));

        testCase.setInput(request.input());
        testCase.setExpectedOutput(request.expectedOutput());
        testCase.setSample(request.sample());

        return toResponse(testCase);
    }

    @Transactional
    public void delete(Long problemId, Long testCaseId) {
        TestCase testCase = testCaseRepository.findByIdAndProblemId(testCaseId, problemId)
                .orElseThrow(() -> new ResourceNotFoundException("Test case not found"));
        testCaseRepository.delete(testCase);
    }

    private void ensureProblemExists(Long problemId) {
        if (!problemRepository.existsById(problemId)) {
            throw new ResourceNotFoundException("Problem not found");
        }
    }

    private TestCaseResponse toResponse(TestCase t) {
        return new TestCaseResponse(t.getId(), t.getInput(), t.getExpectedOutput(),
                t.isSample(), t.getOrderIndex());
    }
}