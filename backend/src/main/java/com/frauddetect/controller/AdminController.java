package com.frauddetect.controller;

import com.frauddetect.dto.*;
import com.frauddetect.service.AdminService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Mono;

import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    // ── Section 1: Overview KPI Metrics ──────────────────────────────────

    @GetMapping("/stats/overview")
    @PreAuthorize("hasAnyRole('ANALYST', 'SUPERADMIN')")
    public Mono<ResponseEntity<OverviewStatsDto>> getOverviewStats() {
        return adminService.getOverviewStats()
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    // ── Section 2: Fraud by Attack Type ──────────────────────────────────

    @GetMapping("/stats/by-type")
    @PreAuthorize("hasAnyRole('ANALYST', 'SUPERADMIN')")
    public Mono<ResponseEntity<FraudByTypeDto>> getFraudByType(
            @RequestParam(defaultValue = "MONTH") String period) {
        return adminService.getFraudByType(period)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    // ── Section 3: Affected Users Registry ───────────────────────────────

    @GetMapping("/users/affected")
    @PreAuthorize("hasAnyRole('ANALYST', 'SUPERADMIN')")
    public Mono<ResponseEntity<AffectedUsersPageDto>> getAffectedUsers(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String riskTier,
            @RequestParam(required = false) String fraudType,
            @RequestParam(required = false) String status) {
        return adminService.getAffectedUsers(page, size, search, riskTier, fraudType, status)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    // ── Section 4: Fraud Ring Profiles ───────────────────────────────────

    @GetMapping("/rings")
    @PreAuthorize("hasAnyRole('ANALYST', 'SUPERADMIN')")
    public Mono<ResponseEntity<java.util.List<FraudRingDto>>> getFraudRings(
            @RequestParam(required = false) Boolean active,
            @RequestParam(required = false) String fraudType) {
        return adminService.getFraudRings(active, fraudType)
                .collectList()
                .map(ResponseEntity::ok);
    }

    @GetMapping("/rings/{ringId}")
    @PreAuthorize("hasAnyRole('ANALYST', 'SUPERADMIN')")
    public Mono<ResponseEntity<FraudRingDto>> getFraudRingById(@PathVariable UUID ringId) {
        return adminService.getFraudRingById(ringId)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    // ── Section 5: Manual Override ───────────────────────────────────────

    @PostMapping("/override/{txnId}")
    @PreAuthorize("hasAnyRole('ANALYST', 'SUPERADMIN')")
    public Mono<ResponseEntity<Map<String, String>>> overrideTransaction(
            @PathVariable UUID txnId,
            @Valid @RequestBody OverrideRequest request,
            @RequestAttribute("username") String analystUsername) {
        return adminService.overrideTransaction(txnId, request, analystUsername)
                .map(result -> ResponseEntity.ok(Map.of(
                        "txnId", txnId.toString(),
                        "status", result,
                        "message", "Transaction override applied successfully")))
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    // ── Section 6: Model Performance ─────────────────────────────────────

    @GetMapping("/model/performance")
    @PreAuthorize("hasAnyRole('ANALYST', 'SUPERADMIN')")
    public Mono<ResponseEntity<ModelPerformanceDto>> getModelPerformance() {
        return adminService.getModelPerformance()
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    @GetMapping("/model/history")
    @PreAuthorize("hasAnyRole('ANALYST', 'SUPERADMIN')")
    public Mono<ResponseEntity<java.util.List<ModelRunDto>>> getModelHistory() {
        return adminService.getModelHistory()
                .collectList()
                .map(ResponseEntity::ok);
    }

    @PostMapping("/model/retrain")
    @PreAuthorize("hasRole('SUPERADMIN')")
    public Mono<ResponseEntity<Map<String, String>>> triggerRetraining(
            @RequestAttribute("username") String username) {
        return adminService.triggerRetraining(username)
                .map(jobId -> ResponseEntity.ok(Map.of(
                        "jobId", jobId,
                        "status", "QUEUED",
                        "message", "Retraining job submitted. Check /model/history for progress.")));
    }

    // ── User Detail Drill-Down ────────────────────────────────────────────

    @GetMapping("/users/{upiHandle}/timeline")
    @PreAuthorize("hasAnyRole('ANALYST', 'SUPERADMIN')")
    public Mono<ResponseEntity<UserFraudTimelineDto>> getUserFraudTimeline(
            @PathVariable String upiHandle) {
        return adminService.getUserFraudTimeline(upiHandle)
                .map(ResponseEntity::ok)
                .defaultIfEmpty(ResponseEntity.notFound().build());
    }

    // ── Auth ──────────────────────────────────────────────────────────────

    @PostMapping("/logout")
    @PreAuthorize("hasAnyRole('ANALYST', 'SUPERADMIN')")
    public Mono<ResponseEntity<Map<String, String>>> logout(
            @RequestHeader("Authorization") String authHeader) {
        String token = authHeader.replace("Bearer ", "");
        return adminService.invalidateSession(token)
                .thenReturn(ResponseEntity.ok(Map.of("message", "Logged out successfully")));
    }
}
