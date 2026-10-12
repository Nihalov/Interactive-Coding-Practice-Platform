package com.nihal.codearena.auth.service;

import com.nihal.codearena.auth.dto.RegisterRequest;
import com.nihal.codearena.auth.dto.UserResponse;
import com.nihal.codearena.auth.entity.Role;
import com.nihal.codearena.auth.entity.User;
import com.nihal.codearena.auth.repository.UserRepository;
import com.nihal.codearena.common.exception.DuplicateResourceException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional
    public UserResponse register(RegisterRequest request) {
        // 1. Normalize: "  Nihal@Example.COM " and "nihal@example.com" must be the same user
        String email = request.email().trim().toLowerCase();

        // 2. Friendly duplicate check (the DB unique constraint is the real safety net)
        if (userRepository.existsByEmail(email)) {
            throw new DuplicateResourceException("Email is already registered");
        }

        // 3. Build the entity. Role is set server-side, never taken from the client.
        User user = User.builder()
                .email(email)
                .username(request.username().trim())
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(Role.USER)
                .build();

        // 4. Save
        User saved = userRepository.save(user);

        // 5. Map to a response DTO (no passwordHash)
        return toResponse(saved);
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