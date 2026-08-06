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
    /*
     * Prompt 6 has no approved cross-family structural dependencies. Future Scope,
     * Coverage, Classification, Policy Scope, and Local Context tables are not part
     * of the active schema. Historical Document links intentionally do not block
     * target soft deletion.
     */
    private static final List<String> ORGANIZATION_DEPENDENCY_QUERIES = List.of();
    private static final List<String> CENTRAL_PROCESS_DEPENDENCY_QUERIES = List.of();
    private static final List<String> CENTRAL_SUBPROCESS_DEPENDENCY_QUERIES = List.of();

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
