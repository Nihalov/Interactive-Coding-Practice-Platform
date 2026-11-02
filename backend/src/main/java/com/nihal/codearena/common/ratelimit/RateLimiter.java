package com.nihal.codearena.common.ratelimit;

import com.nihal.codearena.common.exception.TooManyRequestsException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.util.List;

@Slf4j
@Component
public class RateLimiter {

    // INCR and EXPIRE run atomically, so a counter can never be left without an expiry
    private static final String SCRIPT = """
            local current = redis.call('INCR', KEYS[1])
            if current == 1 then
              redis.call('EXPIRE', KEYS[1], ARGV[1])
            end
            return {current, redis.call('TTL', KEYS[1])}
            """;

    private final StringRedisTemplate redis;
    private final DefaultRedisScript<List> script;

    public RateLimiter(StringRedisTemplate redis) {
        this.redis = redis;
        this.script = new DefaultRedisScript<>(SCRIPT, List.class);
    }

    public void check(String bucket, String subject, int limit, Duration window) {
        String key = "rl:" + bucket + ":" + subject;
        try {
            List<?> result = redis.execute(script, List.of(key), String.valueOf(window.toSeconds()));
            if (result == null || result.size() < 2) {
                return;
            }
            long count = ((Number) result.get(0)).longValue();
            long ttl = ((Number) result.get(1)).longValue();
            if (count > limit) {
                throw new TooManyRequestsException("Too many requests. Please try again later.", Math.max(ttl, 1));
            }
        } catch (TooManyRequestsException e) {
            throw e;
        } catch (RuntimeException e) {
            // Fail open: a Redis outage must not take the platform down
            log.warn("Rate limiter unavailable ({}); allowing the request", e.getMessage());
        }
    }
}