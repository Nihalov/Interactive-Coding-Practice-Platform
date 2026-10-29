package com.nihal.codearena.workspace.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

import java.util.List;

@JsonIgnoreProperties(ignoreUnknown = true)
public record WorkspaceState(
        Integer schemaVersion,
        List<WorkspaceElement> elements
) {}