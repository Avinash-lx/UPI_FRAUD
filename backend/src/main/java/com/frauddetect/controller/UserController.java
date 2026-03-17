package com.frauddetect.controller;

import com.frauddetect.dto.*;
import com.frauddetect.service.TransactionScoringService;
import com.frauddetect.service.UserService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.Map;

@RestController
@RequestMapping("/api/v1")
public class UserController {

    private final TransactionScoringService scoringService;
    private final UserService userService;

    public UserController(TransactionScoringService scoringService, UserService userService) {
        this.scoringService = scoringService;
        this.userService    = userService;
    }

    // POST /api/v1/txn/score — score a live transaction
    @PostMapping("/txn/score")
    public Mono<ResponseEntity<ScoreResponse>> scoreTransaction(
            @Valid @RequestBody ScoreRequest request) {
        return scoringService.scoreTransaction(request)
                .map(ResponseEntity::ok)
                .onErrorReturn(ResponseEntity.internalServerError().build());
    }

    // GET /api/v1/user/{handle}/history — user's transaction history
    @GetMapping("/user/{handle}/history")
    public Mono<ResponseEntity<TransactionHistoryDto>> getUserHistory(
            @PathVariable String handle,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return userService.getUserHistory(handle, page, size)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    // POST /api/v1/user/ask — conversational Q&A about transactions
    @PostMapping("/user/ask")
    public Mono<ResponseEntity<QnAResponse>> askQuestion(
            @Valid @RequestBody QnARequest request) {
        return userService.processQuestion(request)
                .map(ResponseEntity::ok)
                .onErrorReturn(ResponseEntity.internalServerError().build());
    }

    // POST /api/v1/auth/admin/login — admin JWT login
    @PostMapping("/auth/admin/login")
    public Mono<ResponseEntity<AuthResponse>> adminLogin(
            @Valid @RequestBody LoginRequest request) {
        return userService.adminLogin(request)
                .map(ResponseEntity::ok)
                .onErrorReturn(ResponseEntity.status(401).build());
    }

    // POST /api/v1/auth/refresh — refresh JWT token
    @PostMapping("/auth/refresh")
    public Mono<ResponseEntity<AuthResponse>> refreshToken(
            @RequestBody Map<String, String> body) {
        String refreshToken = body.get("refreshToken");
        return userService.refreshToken(refreshToken)
                .map(ResponseEntity::ok)
                .onErrorReturn(ResponseEntity.status(401).build());
    }

    // POST /api/v1/user/report-fraud — user submits a fraud report
    @PostMapping("/user/report-fraud")
    public Mono<ResponseEntity<Map<String, String>>> reportFraud(
            @Valid @RequestBody FraudReportRequest request) {
        return userService.submitFraudReport(request)
                .map(id -> ResponseEntity.ok(Map.of(
                        "reportId", id,
                        "message", "Your report has been submitted. Our team will review it within 24 hours.")))
                .onErrorReturn(ResponseEntity.internalServerError().build());
    }

    // GET /api/v1/fraud/awareness — anonymized live fraud patterns
    @GetMapping("/fraud/awareness")
    public Mono<ResponseEntity<java.util.List<FraudAwarenessDto>>> getAwarenessFeed() {
        return userService.getAwarenessFeed()
                .collectList()
                .map(ResponseEntity::ok);
    }
}
