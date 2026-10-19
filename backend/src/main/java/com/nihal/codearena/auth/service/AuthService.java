package com.nihal.codearena.auth.service;

import com.nihal.codearena.auth.dto.AuthResponse;
import com.nihal.codearena.auth.dto.LoginRequest;
import com.nihal.codearena.auth.dto.RegisterRequest;
import com.nihal.codearena.auth.dto.UserResponse;
import com.nihal.codearena.auth.entity.Role;
import com.nihal.codearena.auth.entity.User;
import com.nihal.codearena.auth.repository.UserRepository;
import com.nihal.codearena.common.exception.DuplicateResourceException;
import com.nihal.codearena.common.exception.InvalidCredentialsException;
import com.nihal.codearena.common.exception.ResourceNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    @Transactional
    public UserResponse register(RegisterRequest request) {
        String email = request.email().trim().toLowerCase();

        if (userRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("Email is already registered");
        }

        User user = User.builder()
                .email(email)
                .username(request.username().trim())
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(Role.USER)
                .build();

        return toResponse(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = request.email().trim().toLowerCase();

        User user = userRepository.findByEmail(email)
                .orElseThrow(InvalidCredentialsException::new);

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new InvalidCredentialsException();
        }

        return new AuthResponse(
                jwtService.generateToken(user),
                "Bearer",
                jwtService.getExpirationSeconds(),
                toResponse(user)
        );
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));
        return toResponse(user);
    }

    private UserResponse toResponse(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getUsername(),
                user.getRole().name(),
                user.getCreatedAt()
        );
    }
}