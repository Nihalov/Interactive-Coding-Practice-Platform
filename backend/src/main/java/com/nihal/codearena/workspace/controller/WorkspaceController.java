package com.nihal.codearena.workspace.controller;

import com.nihal.codearena.workspace.dto.SaveWorkspaceRequest;
import com.nihal.codearena.workspace.dto.WorkspaceResponse;
import com.nihal.codearena.workspace.service.WorkspaceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/problems/{slug}/workspace")
@RequiredArgsConstructor
public class WorkspaceController {

    private final WorkspaceService workspaceService;

    @GetMapping
    public WorkspaceResponse get(@AuthenticationPrincipal Jwt jwt, @PathVariable String slug) {
        return workspaceService.get(userId(jwt), slug);
    }

    @PutMapping
    public WorkspaceResponse save(@AuthenticationPrincipal Jwt jwt,
                                  @PathVariable String slug,
                                  @Valid @RequestBody SaveWorkspaceRequest request) {
        return workspaceService.save(userId(jwt), slug, request);
    }

    private static Long userId(Jwt jwt) {
        return Long.parseLong(jwt.getSubject());
    }
}