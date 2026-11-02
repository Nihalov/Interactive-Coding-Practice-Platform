package com.nihal.codearena.common.cache;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.time.Duration;
import java.util.List;
import java.util.function.Supplier;

@Slf4j
@Component
@RequiredArgsConstructor
public class JsonCache {

    private final StringRedisTemplate redis;
    private final ObjectMapper objectMapper;

    /** Cache-aside: any Redis problem is treated as a miss, so the cache can never break a request. */
    public <T> T getOrLoad(String key, Class<T> type, Duration ttl, Supplier<T> loader) {
        String cached = safeGet(key);
        if (cached != null) {
            try {
                return objectMapper.readValue(cached, type);
            } catch (RuntimeException e) {
                log.warn("Dropping unreadable cache entry {}: {}", key, e.getMessage());
                delete(key);
            }
        }

        T value = loader.get();   // exceptions such as "not found" pass through and are never cached

        try {
            redis.opsForValue().set(key, objectMapper.writeValueAsString(value), ttl);
        } catch (RuntimeException e) {
            log.warn("Could not write cache entry {}: {}", key, e.getMessage());
        }
        return value;
    }

    public void delete(String... keys) {
        try {
            redis.delete(List.of(keys));
        } catch (RuntimeException e) {
            log.warn("Could not delete cache keys {}: {}", List.of(keys), e.getMessage());
        }
    }

    public String counter(String key) {
        String value = safeGet(key);
        return value == null ? "0" : value;
    }

    public void bump(String key) {
        try {
            redis.opsForValue().increment(key);
        } catch (RuntimeException e) {
            log.warn("Could not bump counter {}: {}", key, e.getMessage());
        }
    }

    private String safeGet(String key) {
        try {
            return redis.opsForValue().get(key);
        } catch (RuntimeException e) {
            log.warn("Cache read failed for {}: {}", key, e.getMessage());
            return null;
        }
    }
}