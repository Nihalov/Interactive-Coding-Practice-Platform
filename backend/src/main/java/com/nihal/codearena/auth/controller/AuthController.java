package com.nihal.codearena.auth.controller;

import com.nihal.codearena.auth.dto.AuthResponse;
import com.nihal.codearena.auth.dto.LoginRequest;
import com.nihal.codearena.auth.dto.RegisterRequest;
import com.nihal.codearena.auth.dto.UserResponse;
import com.nihal.codearena.auth.service.AuthService;
import com.nihal.codearena.common.ratelimit.RateLimits;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RateLimits rateLimits;

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request,
                                                 HttpServletRequest http) {
        rateLimits.checkRegistration(http.getRemoteAddr());
        return ResponseEntity.status(HttpStatus.CREATED).body(authService.register(request));
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request, HttpServletRequest http) {
        rateLimits.checkLogin(http.getRemoteAddr());
        return authService.login(request);
    }

    @GetMapping("/me")
    public UserResponse me(@AuthenticationPrincipal Jwt jwt) {
        return authService.getCurrentUser(Long.parseLong(jwt.getSubject()));
    }
}