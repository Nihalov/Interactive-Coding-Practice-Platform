package com.nihal.codearena.problem.controller;

import com.nihal.codearena.common.response.PageResponse;
import com.nihal.codearena.problem.dto.ProblemRequest;
import com.nihal.codearena.problem.dto.ProblemResponse;
import com.nihal.codearena.problem.dto.ProblemSummaryResponse;
import com.nihal.codearena.problem.entity.Difficulty;
import com.nihal.codearena.problem.service.ProblemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/problems")
@RequiredArgsConstructor
public class ProblemController {

    private final ProblemService problemService;

    @GetMapping
    public PageResponse<ProblemSummaryResponse> list(
            @RequestParam(required = false) Difficulty difficulty,
            @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        return problemService.list(difficulty, pageable);
    }

    @GetMapping("/{slug}")
    public ProblemResponse get(@PathVariable String slug) {
        return problemService.getBySlug(slug);
    }

    @PostMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ProblemResponse> create(@Valid @RequestBody ProblemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(problemService.create(request));
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ProblemResponse update(@PathVariable Long id, @Valid @RequestBody ProblemRequest request) {
        return problemService.update(id, request);
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        problemService.delete(id);
        return ResponseEntity.noContent().build();
    }
}