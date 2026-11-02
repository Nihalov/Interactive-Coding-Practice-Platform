package com.nihal.codearena.execution;

import com.nihal.codearena.common.ratelimit.RateLimits;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/problems")
@RequiredArgsConstructor
public class RunController {

    private final RunService runService;
    private final RateLimits rateLimits;

    @PostMapping("/{slug}/run")
    public RunResponse run(@AuthenticationPrincipal Jwt jwt,
                           @PathVariable String slug,
                           @Valid @RequestBody RunRequest request) {
        rateLimits.checkRun(Long.parseLong(jwt.getSubject()));
        return runService.runSamples(slug, request.sourceCode());
    }
}