package com.frauddetect.service;

import com.frauddetect.model.Transaction;
import com.frauddetect.dto.ScoreRequest;
import com.frauddetect.dto.ScoreResponse;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.ReactiveRedisTemplate;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientException;
import reactor.core.publisher.Mono;
import reactor.core.publisher.Sinks;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
public class TransactionScoringService {

    private static final Logger log = LoggerFactory.getLogger(TransactionScoringService.class);

    private final WebClient mlClient;
    private final KafkaTemplate<String, Object> kafkaTemplate;
    private final ReactiveRedisTemplate<String, String> redis;
    private final TransactionRepository txnRepo;
    private final ObjectMapper objectMapper;
    private final boolean failOpen;
    private final long timeoutMs;

    // Reactive sink for WebSocket broadcasting
    public static final Sinks.Many<ScoreResponse> fraudStream =
            Sinks.many().multicast().onBackpressureBuffer();

    public TransactionScoringService(
            WebClient.Builder webClientBuilder,
            @Value("${ml.service.url:http://localhost:8000}") String mlServiceUrl,
            @Value("${ml.service.timeout-ms:5000}") long timeoutMs,
            @Value("${ml.service.fail-open:true}") boolean failOpen,
            KafkaTemplate<String, Object> kafkaTemplate,
            ReactiveRedisTemplate<String, String> redis,
            TransactionRepository txnRepo,
            ObjectMapper objectMapper) {
        this.mlClient     = webClientBuilder.baseUrl(mlServiceUrl).build();
        this.kafkaTemplate = kafkaTemplate;
        this.redis         = redis;
        this.txnRepo       = txnRepo;
        this.objectMapper  = objectMapper;
        this.failOpen      = failOpen;
        this.timeoutMs     = timeoutMs;
    }

    /**
     * Score a transaction in real-time via ML service, persist to DB,
     * publish to Kafka, and push to WebSocket sink.
     */
    public Mono<ScoreResponse> scoreTransaction(ScoreRequest request) {
        String txnId = request.getTxnId() != null ? request.getTxnId() : UUID.randomUUID().toString();
        request.setTxnId(txnId);

        return callMlService(request)
                .flatMap(response -> persistTransaction(request, response)
                        .doOnSuccess(saved -> {
                            publishToKafka(response);
                            broadcastToWebSocket(response);
                        })
                        .thenReturn(response))
                .onErrorReturn(failOpenResponse(request));
    }

    private Mono<ScoreResponse> callMlService(ScoreRequest request) {
        return mlClient.post()
                .uri("/score")
                .bodyValue(request)
                .retrieve()
                .bodyToMono(ScoreResponse.class)
                .timeout(Duration.ofMillis(timeoutMs))
                .doOnError(WebClientException.class, e ->
                        log.error("ML service call failed for txn {}: {}", request.getTxnId(), e.getMessage()))
                .onErrorResume(e -> {
                    if (failOpen) {
                        log.warn("ML service unavailable, fail-open for txn {}", request.getTxnId());
                        return Mono.just(failOpenResponse(request));
                    }
                    return Mono.error(e);
                });
    }

    private Mono<Transaction> persistTransaction(ScoreRequest req, ScoreResponse resp) {
        Transaction txn = new Transaction();
        txn.setTxnId(UUID.fromString(req.getTxnId()));
        txn.setUpiHandle(req.getUpiHandle());
        txn.setMerchant(req.getMerchant());
        txn.setMerchantCategory(req.getMerchantCategory());
        txn.setAmount(req.getAmount());
        txn.setTimestamp(LocalDateTime.now());
        txn.setRiskScore(resp.getRiskScore());
        txn.setDecision(resp.getDecision());
        txn.setFraudType(resp.getFraudType());
        txn.setStatus("PENDING");
        txn.setDeviceId(req.getDeviceId());
        txn.setDeviceAgeDays(req.getDeviceAgeDays() != null ? req.getDeviceAgeDays().intValue() : null);
        txn.setLocationCity(req.getLocationCity());
        txn.setLocationCountry(req.getLocationCountry());

        try {
            if (resp.getExplanation() != null) {
                txn.setShapExplanation(objectMapper.writeValueAsString(resp.getExplanation()));
            }
        } catch (Exception e) {
            log.warn("Could not serialize SHAP explanation: {}", e.getMessage());
        }

        return txnRepo.save(txn);
    }

    private void publishToKafka(ScoreResponse response) {
        try {
            kafkaTemplate.send("scored-transactions", response.getTxnId(), response);
            if ("BLOCK".equals(response.getDecision()) || "FLAG".equals(response.getDecision())) {
                kafkaTemplate.send("fraud-alerts", response.getTxnId(), response);
            }
        } catch (Exception e) {
            log.error("Kafka publish failed for txn {}: {}", response.getTxnId(), e.getMessage());
        }
    }

    private void broadcastToWebSocket(ScoreResponse response) {
        fraudStream.tryEmitNext(response);
    }

    private ScoreResponse failOpenResponse(ScoreRequest req) {
        ScoreResponse resp = new ScoreResponse();
        resp.setTxnId(req.getTxnId());
        resp.setUpiHandle(req.getUpiHandle());
        resp.setRiskScore(0.0);
        resp.setDecision("ALLOW");
        resp.setFraudType("LEGITIMATE");
        resp.setModelVersion("FAIL_OPEN");
        return resp;
    }
}
