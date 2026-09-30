package com.digiaudit.grcpc.modules.dashboard.api;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record MasterDataDashboardResponse(
        List<Kpi> kpis,
        List<StatusCount> statusCounts,
        List<RiskTypeCount> riskTypes,
        List<ProcessCount> topProcesses,
        List<MonthCount> registrations,
        List<RecentChange> recentChanges
) {
    public record Kpi(String key, long count) {}
    public record StatusCount(String type, long active, long inactive) {}
    public record RiskTypeCount(String type, long count) {}
    public record ProcessCount(UUID id, String title, long activeSubprocesses) {}
    public record MonthCount(String month, long count) {}
    public record RecentChange(String type, UUID id, String title, Instant updatedAt) {}
}
