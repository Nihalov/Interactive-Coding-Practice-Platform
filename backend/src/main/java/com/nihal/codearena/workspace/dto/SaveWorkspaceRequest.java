package com.nihal.codearena.workspace.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;

@JsonIgnoreProperties(ignoreUnknown = true)
public record SaveWorkspaceRequest(
        Long version,
        @NotNull @Valid WorkspaceState state
) {}