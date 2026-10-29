package com.nihal.codearena.workspace.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.annotation.JsonInclude;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
@JsonIgnoreProperties(ignoreUnknown = true)
public record WorkspaceElement(
        String id,
        String type,
        Double x,
        Double y,
        String name,
        List<Object> values,
        String value,
        String text,
        String targetElementId,
        Integer index,
        String fromElementId,
        String toElementId,
        String label
) {}