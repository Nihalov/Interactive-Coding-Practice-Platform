package com.nihal.codearena.testcase.controller;

import com.nihal.codearena.testcase.dto.SampleTestCaseResponse;
import com.nihal.codearena.testcase.dto.TestCaseRequest;
import com.nihal.codearena.testcase.dto.TestCaseResponse;
import com.nihal.codearena.testcase.service.TestCaseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class TestCaseController {

    private final TestCaseService testCaseService;

    // Any logged-in user: sample cases only
    @GetMapping("/problems/{slug}/samples")
    public List<SampleTestCaseResponse> samples(@PathVariable String slug) {
        return testCaseService.getSamples(slug);
    }

    // Admin only from here down
    @GetMapping("/problems/{problemId}/test-cases")
    @PreAuthorize("hasRole('ADMIN')")
    public List<TestCaseResponse> listAll(@PathVariable Long problemId) {
        return testCaseService.listAll(problemId);
    }

    @PostMapping("/problems/{problemId}/test-cases")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<TestCaseResponse> create(@PathVariable Long problemId,
                                                   @Valid @RequestBody TestCaseRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(testCaseService.create(problemId, request));
    }

    @PutMapping("/problems/{problemId}/test-cases/{testCaseId}")
    @PreAuthorize("hasRole('ADMIN')")
    public TestCaseResponse update(@PathVariable Long problemId,
                                   @PathVariable Long testCaseId,
                                   @Valid @RequestBody TestCaseRequest request) {
        return testCaseService.update(problemId, testCaseId, request);
    }

    @DeleteMapping("/problems/{problemId}/test-cases/{testCaseId}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long problemId,
                                       @PathVariable Long testCaseId) {
        testCaseService.delete(problemId, testCaseId);
        return ResponseEntity.noContent().build();
    }
}