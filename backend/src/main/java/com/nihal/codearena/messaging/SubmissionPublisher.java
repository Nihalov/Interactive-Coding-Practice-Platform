package com.nihal.codearena.messaging;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class SubmissionPublisher {

    private final RabbitTemplate rabbitTemplate;

    public void publish(Long submissionId) {
        rabbitTemplate.convertAndSend(RabbitConfig.EXCHANGE, RabbitConfig.ROUTING_KEY,
                String.valueOf(submissionId));
    }

    /** Never throws: a failed publish leaves the row QUEUED and the recovery job re-publishes it. */
    public boolean publishQuietly(Long submissionId) {
        try {
            publish(submissionId);
            return true;
        } catch (AmqpException e) {
            log.error("Could not publish submission {}; recovery job will retry", submissionId, e);
            return false;
        }
    }
}