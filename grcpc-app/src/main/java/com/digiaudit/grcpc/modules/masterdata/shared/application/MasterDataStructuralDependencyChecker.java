package com.digiaudit.grcpc.modules.masterdata.shared.application;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.nio.ByteBuffer;
import java.sql.PreparedStatement;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Component
public class MasterDataStructuralDependencyChecker {
    private static final List<String> ORGANIZATION_DEPENDENCY_QUERIES = List.of(
            "select count(1) from local_organization_subprocess_scope where organization_id = ? and status <> 'DELETED'",
            "select count(1) from local_policy_organization_scope where organization_id = ? and status <> 'DELETED'",
            "select count(1) from document_link where target_type = 'ORG' and target_id = ? and status <> 'DELETED'"
    );
    private static final List<String> CENTRAL_PROCESS_DEPENDENCY_QUERIES = List.of(
            "select count(1) from document_link where target_type = 'CENTRAL_PROCESS' and target_id = ? and status <> 'DELETED'"
    );
    private static final List<String> CENTRAL_SUBPROCESS_DEPENDENCY_QUERIES = List.of(
            "select count(1) from central_subprocess_control_scope where subprocess_id = ? and status <> 'DELETED'",
            "select count(1) from central_subprocess_risk_scope where subprocess_id = ? and status <> 'DELETED'",
            "select count(1) from central_subprocess_control_objective_scope where subprocess_id = ? and status <> 'DELETED'",
            "select count(1) from central_subprocess_requirement_scope where subprocess_id = ? and status <> 'DELETED'",
            "select count(1) from central_policy_version_subprocess_scope where subprocess_id = ? and status <> 'DELETED'",
            "select count(1) from central_subprocess_risk_control_coverage where subprocess_id = ? and status <> 'DELETED'",
            "select count(1) from central_subprocess_risk_control_objective_coverage where subprocess_id = ? and status <> 'DELETED'",
            "select count(1) from central_subprocess_control_control_objective_coverage where subprocess_id = ? and status <> 'DELETED'",
            "select count(1) from central_subprocess_requirement_control_coverage where subprocess_id = ? and status <> 'DELETED'",
            "select count(1) from local_organization_subprocess_scope where subprocess_id = ? and status <> 'DELETED'",
            "select count(1) from document_link where target_type = 'CENTRAL_SUBPROCESS' and target_id = ? and status <> 'DELETED'"
    );

    private final JdbcTemplate jdbcTemplate;

    public MasterDataStructuralDependencyChecker(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = Objects.requireNonNull(jdbcTemplate, "jdbcTemplate is required");
    }

    public boolean organizationHasApprovedDependencies(UUID organizationId) {
        return anyExists(ORGANIZATION_DEPENDENCY_QUERIES, organizationId);
    }

    public boolean centralProcessHasApprovedDependencies(UUID processId) {
        return anyExists(CENTRAL_PROCESS_DEPENDENCY_QUERIES, processId);
    }

    public boolean centralSubprocessHasApprovedDependencies(UUID subprocessId) {
        return anyExists(CENTRAL_SUBPROCESS_DEPENDENCY_QUERIES, subprocessId);
    }

    private boolean anyExists(List<String> queries, UUID id) {
        for (String sql : queries) {
            if (exists(sql, id)) {
                return true;
            }
        }
        return false;
    }

    private boolean exists(String sql, UUID id) {
        return Boolean.TRUE.equals(jdbcTemplate.query(connection -> {
            PreparedStatement statement = connection.prepareStatement(sql);
            statement.setBytes(1, toBytes(id));
            return statement;
        }, resultSet -> resultSet.next() && resultSet.getLong(1) > 0L));
    }

    private static byte[] toBytes(UUID uuid) {
        ByteBuffer buffer = ByteBuffer.allocate(16);
        buffer.putLong(uuid.getMostSignificantBits());
        buffer.putLong(uuid.getLeastSignificantBits());
        return buffer.array();
    }
}
