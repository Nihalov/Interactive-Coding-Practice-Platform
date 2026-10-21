package com.nihal.codearena.execution;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/problems")
@RequiredArgsConstructor
public class RunController {

    private final RunService runService;

    @PostMapping("/{slug}/run")
    public RunResponse run(@PathVariable String slug, @Valid @RequestBody RunRequest request) {
        return runService.runSamples(slug, request.sourceCode());
    }
}