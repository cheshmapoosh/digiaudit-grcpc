package com.digiaudit.grcpc.modules.dashboard.application;

import com.digiaudit.grcpc.modules.dashboard.api.MasterDataDashboardResponse;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.enums.CentralRiskType;
import com.digiaudit.grcpc.modules.masterdata.security.MasterDataAuthorizationService;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.EntityManager;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class MasterDataDashboardService {
    private static final MasterDataLifecycleStatus ACTIVE = MasterDataLifecycleStatus.ACTIVE;
    private static final MasterDataLifecycleStatus INACTIVE = MasterDataLifecycleStatus.INACTIVE;
    private static final List<Source> SOURCES = List.of(
            new Source("ORGANIZATION", "OrganizationEntity", "name", "REFERENCE"),
            new Source("PROCESS", "CentralProcessEntity", "title", "PROCESS"),
            new Source("SUBPROCESS", "CentralSubprocessEntity", "title", "PROCESS"),
            new Source("RISK_TEMPLATE", "CentralRiskTemplateEntity", "title", "RISK"),
            new Source("CONTROL", "CentralControlEntity", "title", "CONTROL")
    );

    private final EntityManager entityManager;
    private final MasterDataAuthorizationService authorization;

    @Transactional(readOnly = true)
    public MasterDataDashboardResponse get() {
        List<Source> visible = SOURCES.stream()
                .filter(source -> authorization.canView(source.area()))
                .toList();
        Map<String, MasterDataDashboardResponse.StatusCount> statuses = new LinkedHashMap<>();
        for (Source source : visible) {
            statuses.put(source.key(), statusCount(source));
        }

        List<MasterDataDashboardResponse.Kpi> kpis = new ArrayList<>();
        addKpi(kpis, statuses, "ORGANIZATION");
        if (statuses.containsKey("PROCESS")) {
            kpis.add(new MasterDataDashboardResponse.Kpi("PROCESS_AND_SUBPROCESS",
                    statuses.get("PROCESS").active() + statuses.get("SUBPROCESS").active()));
        }
        addKpi(kpis, statuses, "RISK_TEMPLATE");
        addKpi(kpis, statuses, "CONTROL");

        YearMonth currentMonth = YearMonth.now(ZoneOffset.UTC);
        YearMonth firstMonth = currentMonth.minusMonths(5);
        Instant from = firstMonth.atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant until = currentMonth.plusMonths(1).atDay(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        Map<YearMonth, Long> monthCounts = new LinkedHashMap<>();
        for (int index = 0; index < 6; index++) {
            monthCounts.put(firstMonth.plusMonths(index), 0L);
        }
        List<MasterDataDashboardResponse.RecentChange> changes = new ArrayList<>();
        for (Source source : visible) {
            addRegistrations(source, from, until, monthCounts);
            changes.addAll(recentChanges(source));
        }

        return new MasterDataDashboardResponse(
                List.copyOf(kpis),
                List.copyOf(statuses.values()),
                visible.stream().anyMatch(source -> source.key().equals("RISK_TEMPLATE")) ? riskTypes() : List.of(),
                visible.stream().anyMatch(source -> source.key().equals("PROCESS")) ? topProcesses() : List.of(),
                visible.isEmpty() ? List.of() : monthCounts.entrySet().stream()
                        .map(entry -> new MasterDataDashboardResponse.MonthCount(entry.getKey().toString(), entry.getValue()))
                        .toList(),
                changes.stream()
                        .sorted(Comparator.comparing(MasterDataDashboardResponse.RecentChange::updatedAt).reversed()
                                .thenComparing(MasterDataDashboardResponse.RecentChange::type)
                                .thenComparing(MasterDataDashboardResponse.RecentChange::title))
                        .limit(5)
                        .toList()
        );
    }

    private void addKpi(List<MasterDataDashboardResponse.Kpi> kpis,
                        Map<String, MasterDataDashboardResponse.StatusCount> statuses, String key) {
        if (statuses.containsKey(key)) {
            kpis.add(new MasterDataDashboardResponse.Kpi(key, statuses.get(key).active()));
        }
    }

    private MasterDataDashboardResponse.StatusCount statusCount(Source source) {
        var rows = entityManager.createQuery(
                        "select e.status, count(e) from " + source.entity() + " e "
                                + "where e.status in :statuses group by e.status", Object[].class)
                .setParameter("statuses", List.of(ACTIVE, INACTIVE))
                .getResultList();
        long active = 0;
        long inactive = 0;
        for (Object[] row : rows) {
            if (row[0] == ACTIVE) active = ((Number) row[1]).longValue();
            if (row[0] == INACTIVE) inactive = ((Number) row[1]).longValue();
        }
        return new MasterDataDashboardResponse.StatusCount(source.key(), active, inactive);
    }

    private List<MasterDataDashboardResponse.RiskTypeCount> riskTypes() {
        return entityManager.createQuery(
                        "select e.riskType, count(e) from CentralRiskTemplateEntity e "
                                + "where e.status = :active group by e.riskType", Object[].class)
                .setParameter("active", ACTIVE)
                .getResultList().stream()
                .map(row -> new MasterDataDashboardResponse.RiskTypeCount(
                        ((CentralRiskType) row[0]).name(), ((Number) row[1]).longValue()))
                .toList();
    }

    private List<MasterDataDashboardResponse.ProcessCount> topProcesses() {
        return entityManager.createQuery(
                        "select p.id, p.title, count(s) from CentralProcessEntity p "
                                + "left join CentralSubprocessEntity s on s.processId = p.id and s.status = :active "
                                + "where p.status = :active "
                                + "group by p.id, p.title order by count(s) desc, p.title asc", Object[].class)
                .setParameter("active", ACTIVE)
                .setMaxResults(5)
                .getResultList().stream()
                .map(row -> new MasterDataDashboardResponse.ProcessCount(
                        (UUID) row[0], (String) row[1], ((Number) row[2]).longValue()))
                .toList();
    }

    private void addRegistrations(Source source, Instant from, Instant until, Map<YearMonth, Long> counts) {
        var rows = entityManager.createQuery(
                        "select year(e.createdAt), month(e.createdAt), count(e) from " + source.entity() + " e "
                                + "where e.status in :statuses and e.createdAt >= :from and e.createdAt < :until "
                                + "group by year(e.createdAt), month(e.createdAt)", Object[].class)
                .setParameter("statuses", List.of(ACTIVE, INACTIVE))
                .setParameter("from", from)
                .setParameter("until", until)
                .getResultList();
        for (Object[] row : rows) {
            YearMonth month = YearMonth.of(((Number) row[0]).intValue(), ((Number) row[1]).intValue());
            counts.computeIfPresent(month, (key, count) -> count + ((Number) row[2]).longValue());
        }
    }

    private List<MasterDataDashboardResponse.RecentChange> recentChanges(Source source) {
        return entityManager.createQuery(
                        "select e.id, e." + source.titleField() + ", e.updatedAt from " + source.entity() + " e "
                                + "where e.status in :statuses order by e.updatedAt desc", Object[].class)
                .setParameter("statuses", List.of(ACTIVE, INACTIVE))
                .setMaxResults(5)
                .getResultList().stream()
                .map(row -> new MasterDataDashboardResponse.RecentChange(
                        source.key(), (UUID) row[0], (String) row[1], (Instant) row[2]))
                .toList();
    }

    private record Source(String key, String entity, String titleField, String area) {}
}
