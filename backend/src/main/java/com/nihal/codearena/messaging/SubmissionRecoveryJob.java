package com.nihal.codearena.messaging;

import com.nihal.codearena.submission.entity.Submission;
import com.nihal.codearena.submission.entity.SubmissionStatus;
import com.nihal.codearena.submission.repository.SubmissionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDateTime;

@Slf4j
@Component
@RequiredArgsConstructor
public class SubmissionRecoveryJob {

    private final SubmissionRepository submissionRepository;
    private final SubmissionPublisher publisher;
    private final TransactionTemplate tx;

    @Value("${app.recovery.queued-after-minutes}")
    private long queuedAfterMinutes;

    @Value("${app.recovery.running-after-minutes}")
    private long runningAfterMinutes;

    @Scheduled(fixedDelayString = "${app.recovery.interval-ms}", initialDelay = 30000)
    public void recover() {
        LocalDateTime now = LocalDateTime.now();

        // 1. QUEUED for too long: the message may never have been published or may have been lost
        for (Submission s : submissionRepository
                .findTop50ByStatusAndSubmittedAtBefore(SubmissionStatus.QUEUED, now.minusMinutes(queuedAfterMinutes))) {
            log.warn("Re-publishing submission {} stuck in QUEUED", s.getId());
            publisher.publishQuietly(s.getId());
        }

        // 2. RUNNING for too long: the worker most likely died
        for (Submission s : submissionRepository
                .findTop50ByStatusAndStartedAtBefore(SubmissionStatus.RUNNING, now.minusMinutes(runningAfterMinutes))) {
            Integer released = tx.execute(status -> submissionRepository.release(s.getId()));
            if (released != null && released == 1) {
                log.warn("Released submission {} stuck in RUNNING; re-publishing", s.getId());
                publisher.publishQuietly(s.getId());
            }
        }
    }
}