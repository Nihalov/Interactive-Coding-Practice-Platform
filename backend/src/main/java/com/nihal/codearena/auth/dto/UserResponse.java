package com.nihal.codearena.auth.dto;

import java.time.LocalDateTime;

public record UserResponse(
        Long id,
        String email,
        String username,
        String role,
        LocalDateTime createdAt
) {}