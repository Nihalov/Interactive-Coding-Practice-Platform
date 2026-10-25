package com.nihal.codearena.messaging;

import com.nihal.codearena.submission.service.SubmissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class SubmissionWorker {

    private final SubmissionService submissionService;

    @RabbitListener(queues = RabbitConfig.QUEUE)
    public void onMessage(String body) {
        Long submissionId = Long.valueOf(body.trim());
        log.info("Worker picked up submission {}", submissionId);
        submissionService.process(submissionId);
    }

    @RabbitListener(queues = RabbitConfig.DEAD_LETTER_QUEUE)
    public void onDeadLetter(String body) {
        try {
            Long submissionId = Long.valueOf(body.trim());
            log.error("Submission {} reached the dead-letter queue", submissionId);
            submissionService.markFailed(submissionId, "Judging failed after several attempts");
        } catch (NumberFormatException e) {
            log.error("Discarding malformed message in dead-letter queue: {}", body);
        }
    }
}