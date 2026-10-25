package com.nihal.codearena.submission.controller;

import com.nihal.codearena.common.response.PageResponse;
import com.nihal.codearena.submission.dto.SubmissionResponse;
import com.nihal.codearena.submission.dto.SubmissionSummaryResponse;
import com.nihal.codearena.submission.dto.SubmitRequest;
import com.nihal.codearena.submission.service.SubmissionQueryService;
import com.nihal.codearena.submission.service.SubmissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class SubmissionController {

    private final SubmissionService submissionService;
    private final SubmissionQueryService queryService;

    @PostMapping("/submissions")
    public ResponseEntity<SubmissionResponse> submit(@AuthenticationPrincipal Jwt jwt,
                                                     @Valid @RequestBody SubmitRequest request) {
        return ResponseEntity.accepted()
                .body(submissionService.submit(userId(jwt), request));
    }

    @GetMapping("/submissions/{id}")
    public SubmissionResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable Long id) {
        return queryService.get(id, userId(jwt));
    }

    @GetMapping("/users/me/submissions")
    public PageResponse<SubmissionSummaryResponse> history(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String problem,
            @PageableDefault(size = 20, sort = "submittedAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return queryService.history(userId(jwt), problem, pageable);
    }

    private static Long userId(Jwt jwt) {
        return Long.parseLong(jwt.getSubject());
    }
}