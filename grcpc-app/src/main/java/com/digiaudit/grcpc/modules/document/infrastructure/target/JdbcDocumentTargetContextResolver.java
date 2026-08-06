package com.digiaudit.grcpc.modules.document.infrastructure.target;

import com.digiaudit.grcpc.modules.document.application.DocumentFailures;
import com.digiaudit.grcpc.modules.document.application.DocumentTargetContextResolver;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import com.digiaudit.grcpc.modules.document.domain.DocumentTargetContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.sql.PreparedStatement;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;

@Component
public class JdbcDocumentTargetContextResolver implements DocumentTargetContextResolver {
    private final JdbcTemplate jdbcTemplate;

    public JdbcDocumentTargetContextResolver(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = Objects.requireNonNull(jdbcTemplate, "jdbcTemplate is required");
    }

    @Override
    public DocumentTargetContext resolvePublic(DocumentLinkTargetType targetType, UUID targetId) {
        Objects.requireNonNull(targetType, "targetType is required");
        Objects.requireNonNull(targetId, "targetId is required");
        if (!targetType.isPublicSelectable()) {
            throw DocumentFailures.invalid("TARGET_NOT_ALLOWED", "Document link target type is not allowed from browser requests");
        }
        return switch (targetType) {
            case ORGANIZATION -> central(targetType, targetId, "select id from organization where id = ? and status <> 'DELETED'");
            case CENTRAL_PROCESS -> central(targetType, targetId, "select id from central_process where id = ? and status <> 'DELETED'");
            case CENTRAL_SUBPROCESS -> central(targetType, targetId, "select id from central_subprocess where id = ? and status <> 'DELETED'");
            case CENTRAL_CONTROL -> central(targetType, targetId, "select id from central_control where id = ? and status <> 'DELETED'");
            case CENTRAL_CONTROL_OBJECTIVE -> central(targetType, targetId, "select id from central_control_objective where id = ? and status <> 'DELETED'");
            case CENTRAL_RISK_CATEGORY -> central(targetType, targetId, "select id from central_risk_category where id = ? and status <> 'DELETED'");
            case CENTRAL_RISK_TEMPLATE -> central(targetType, targetId, "select id from central_risk_template where id = ? and status <> 'DELETED'");
            case CENTRAL_ACCOUNT_GROUP -> central(targetType, targetId, "select id from central_account_group where id = ? and status <> 'DELETED'");
            case CENTRAL_REGULATION_GROUP -> central(targetType, targetId, "select id from central_regulation_group where id = ? and status <> 'DELETED'");
            case CENTRAL_REGULATION -> central(targetType, targetId, "select id from central_regulation where id = ? and status <> 'DELETED'");
            case CENTRAL_REGULATION_REQUIREMENT -> central(targetType, targetId, "select id from central_regulation_requirement where id = ? and status <> 'DELETED'");
            case CENTRAL_POLICY_GROUP -> central(targetType, targetId, "select id from central_policy_group where id = ? and status <> 'DELETED'");
            case CENTRAL_POLICY -> central(targetType, targetId, "select id from central_policy where id = ? and status <> 'DELETED'");
            case CENTRAL_POLICY_VERSION -> central(targetType, targetId, "select id from central_policy_version where id = ? and status <> 'DELETED'");
            case MASTERDATA_REVISION -> throw DocumentFailures.invalid("TARGET_NOT_ALLOWED", "Document link target type is not allowed from browser requests");
        };
    }

    @Override
    public void assertMutable(DocumentLinkTargetType targetType, UUID targetId) {
        String sql = switch (targetType) {
            case ORGANIZATION -> "select id from organization where id = ? and status <> 'DELETED' for update";
            case CENTRAL_PROCESS -> "select id from central_process where id = ? and status <> 'DELETED' for update";
            case CENTRAL_SUBPROCESS -> "select id from central_subprocess where id = ? and status <> 'DELETED' for update";
            case CENTRAL_CONTROL -> "select id from central_control where id = ? and status <> 'DELETED' for update";
            case CENTRAL_CONTROL_OBJECTIVE -> "select id from central_control_objective where id = ? and status <> 'DELETED' for update";
            case CENTRAL_RISK_CATEGORY -> "select id from central_risk_category where id = ? and status <> 'DELETED' for update";
            case CENTRAL_RISK_TEMPLATE -> "select id from central_risk_template where id = ? and status <> 'DELETED' for update";
            case CENTRAL_ACCOUNT_GROUP -> "select id from central_account_group where id = ? and status <> 'DELETED' for update";
            case CENTRAL_REGULATION_GROUP -> "select id from central_regulation_group where id = ? and status <> 'DELETED' for update";
            case CENTRAL_REGULATION -> "select id from central_regulation where id = ? and status <> 'DELETED' for update";
            case CENTRAL_REGULATION_REQUIREMENT -> "select id from central_regulation_requirement where id = ? and status <> 'DELETED' for update";
            case CENTRAL_POLICY_GROUP -> "select id from central_policy_group where id = ? and status <> 'DELETED' for update";
            case CENTRAL_POLICY -> "select id from central_policy where id = ? and status <> 'DELETED' for update";
            case CENTRAL_POLICY_VERSION -> "select id from central_policy_version where id = ? and status <> 'DELETED' and version_status = 'DRAFT' for update";
            case MASTERDATA_REVISION -> throw DocumentFailures.invalid(
                    "TARGET_NOT_ALLOWED",
                    "Document link target type is not allowed from browser requests"
            );
        };
        if (queryUuid(sql, targetId).isPresent()) {
            return;
        }
        if (targetType == DocumentLinkTargetType.CENTRAL_POLICY_VERSION) {
            throw DocumentFailures.invalid("IMMUTABLE_POLICY_VERSION", "Published and superseded policy version documents are immutable");
        }
        throw DocumentFailures.notFound("TARGET_NOT_FOUND", "Document link target was not found");
    }

    private DocumentTargetContext central(DocumentLinkTargetType targetType, UUID targetId, String sql) {
        Optional<UUID> existing = queryUuid(sql, targetId);
        if (existing.isEmpty()) {
            throw DocumentFailures.notFound("TARGET_NOT_FOUND", "Document link target was not found");
        }
        return new DocumentTargetContext(
                targetType,
                targetId,
                targetType.wireValue(),
                targetId
        );
    }

    private DocumentTargetContext local(DocumentLinkTargetType targetType, UUID targetId, String sql) {
        UUID organizationId = queryUuid(sql, targetId)
                .orElseThrow(() -> DocumentFailures.notFound("TARGET_NOT_FOUND", "Document link target was not found"));
        return new DocumentTargetContext(
                targetType,
                targetId,
                targetType.wireValue(),
                targetId
        );
    }

    private Optional<UUID> queryUuid(String sql, UUID id) {
        return jdbcTemplate.query(connection -> {
            PreparedStatement statement = connection.prepareStatement(sql);
            statement.setBytes(1, OracleRawUuid.toBytes(id));
            return statement;
        }, resultSet -> {
            if (!resultSet.next()) {
                return Optional.empty();
            }
            return Optional.of(OracleRawUuid.fromBytes(resultSet.getBytes(1)));
        });
    }
}
