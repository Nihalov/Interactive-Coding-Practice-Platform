package com.nihal.codearena.common.ratelimit;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.time.Duration;

@Component
@RequiredArgsConstructor
public class RateLimits {

    private final RateLimiter limiter;

    @Value("${app.rate-limit.submissions-per-minute}")
    private int submissionsPerMinute;

    @Value("${app.rate-limit.runs-per-minute}")
    private int runsPerMinute;

    @Value("${app.rate-limit.logins-per-minute}")
    private int loginsPerMinute;

    @Value("${app.rate-limit.registrations-per-hour}")
    private int registrationsPerHour;

    public void checkSubmission(Long userId) {
        limiter.check("submit", String.valueOf(userId), submissionsPerMinute, Duration.ofMinutes(1));
    }

    public void checkRun(Long userId) {
        limiter.check("run", String.valueOf(userId), runsPerMinute, Duration.ofMinutes(1));
    }

    public void checkLogin(String ip) {
        limiter.check("login", ip, loginsPerMinute, Duration.ofMinutes(1));
    }

    public void checkRegistration(String ip) {
        limiter.check("register", ip, registrationsPerHour, Duration.ofHours(1));
    }
}