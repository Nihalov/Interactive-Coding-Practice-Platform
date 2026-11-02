package com.nihal.codearena.problem.cache;

import com.nihal.codearena.common.cache.JsonCache;
import com.nihal.codearena.problem.dto.ProblemPageSnapshot;
import com.nihal.codearena.problem.dto.ProblemResponse;
import com.nihal.codearena.testcase.dto.SampleList;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.Duration;
import java.util.function.Supplier;

@Component
@RequiredArgsConstructor
public class ProblemCache {

    private static final String LIST_VERSION_KEY = "problems:list:version";

    private final JsonCache cache;

    @Value("${app.cache.problem-ttl-minutes}")
    private long problemTtlMinutes;

    @Value("${app.cache.list-ttl-minutes}")
    private long listTtlMinutes;

    public ProblemResponse detail(String slug, Supplier<ProblemResponse> loader) {
        return cache.getOrLoad("problem:" + slug, ProblemResponse.class,
                Duration.ofMinutes(problemTtlMinutes), loader);
    }

    public SampleList samples(String slug, Supplier<SampleList> loader) {
        return cache.getOrLoad("problem:samples:" + slug, SampleList.class,
                Duration.ofMinutes(problemTtlMinutes), loader);
    }

    public ProblemPageSnapshot list(String variant, Supplier<ProblemPageSnapshot> loader) {
        // The version is part of the key: bumping it invalidates every cached page at once
        String key = "problems:list:v" + cache.counter(LIST_VERSION_KEY) + ":" + variant;
        return cache.getOrLoad(key, ProblemPageSnapshot.class, Duration.ofMinutes(listTtlMinutes), loader);
    }

    /** A problem changed: drop its detail and samples and invalidate every list page. */
    public void evictProblem(String slug) {
        afterCommit(() -> {
            cache.delete("problem:" + slug, "problem:samples:" + slug);
            cache.bump(LIST_VERSION_KEY);
        });
    }

    /** Test cases changed: only the samples are affected. */
    public void evictSamples(String slug) {
        afterCommit(() -> cache.delete("problem:samples:" + slug));
    }

    // Evicting before the commit would let another request re-cache the old row
    private void afterCommit(Runnable action) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    action.run();
                }
            });
        } else {
            action.run();
        }
    }
}