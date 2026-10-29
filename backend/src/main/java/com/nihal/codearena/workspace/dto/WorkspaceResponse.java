package com.nihal.codearena.workspace.dto;

import java.time.LocalDateTime;

public record WorkspaceResponse(
        Long version,
        LocalDateTime updatedAt,
        WorkspaceState state
) {}