package com.nihal.codearena.problem.dto;

import com.nihal.codearena.common.response.PageResponse;

import java.util.List;

public record ProblemPageSnapshot(
        List<ProblemSummaryResponse> content,
        int page,
        int size,
        long totalElements,
        int totalPages
) {
    public static ProblemPageSnapshot from(PageResponse<ProblemSummaryResponse> p) {
        return new ProblemPageSnapshot(p.content(), p.page(), p.size(), p.totalElements(), p.totalPages());
    }

    public PageResponse<ProblemSummaryResponse> toPageResponse() {
        return new PageResponse<>(content, page, size, totalElements, totalPages);
    }
}