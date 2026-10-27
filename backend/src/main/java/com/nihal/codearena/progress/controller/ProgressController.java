package com.nihal.codearena.progress.controller;

import com.nihal.codearena.common.response.PageResponse;
import com.nihal.codearena.progress.dto.ProgressResponse;
import com.nihal.codearena.progress.dto.StatsResponse;
import com.nihal.codearena.progress.service.ProgressService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/users/me")
@RequiredArgsConstructor
public class ProgressController {

    private final ProgressService progressService;

    @GetMapping("/progress")
    public PageResponse<ProgressResponse> progress(
            @AuthenticationPrincipal Jwt jwt,
            @PageableDefault(size = 20, sort = "lastAttemptAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return progressService.list(Long.parseLong(jwt.getSubject()), pageable);
    }

    @GetMapping("/stats")
    public StatsResponse stats(@AuthenticationPrincipal Jwt jwt) {
        return progressService.stats(Long.parseLong(jwt.getSubject()));
    }
}