package com.digiaudit.grcpc.modules.document.infrastructure.target;

import com.digiaudit.grcpc.modules.document.application.DocumentFailures;
import com.digiaudit.grcpc.modules.document.application.DocumentTargetContextResolver;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import com.digiaudit.grcpc.modules.document.domain.DocumentTargetContext;
import com.digiaudit.grcpc.modules.masterdata.revision.application.RevisionExecutionContext;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.RevisionDomain;
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
            case CENTRAL_SUBPROCESS_CONTROL_SCOPE -> central(targetType, targetId, "select id from central_subprocess_control_scope where id = ? and status <> 'DELETED'");
            case CENTRAL_SUBPROCESS_RISK_SCOPE -> central(targetType, targetId, "select id from central_subprocess_risk_scope where id = ? and status <> 'DELETED'");
            case CENTRAL_SUBPROCESS_CONTROL_OBJECTIVE_SCOPE -> central(targetType, targetId, "select id from central_subprocess_control_objective_scope where id = ? and status <> 'DELETED'");
            case CENTRAL_SUBPROCESS_REQUIREMENT_SCOPE -> central(targetType, targetId, "select id from central_subprocess_requirement_scope where id = ? and status <> 'DELETED'");
            case CENTRAL_POLICY_VERSION_SUBPROCESS_SCOPE -> central(targetType, targetId, "select id from central_policy_version_subprocess_scope where id = ? and status <> 'DELETED'");
            case CENTRAL_POLICY_VERSION_CONTROL_SCOPE -> central(targetType, targetId, "select id from central_policy_version_control_scope where id = ? and status <> 'DELETED'");
            case CENTRAL_POLICY_VERSION_REQUIREMENT_SCOPE -> central(targetType, targetId, "select id from central_policy_version_requirement_scope where id = ? and status <> 'DELETED'");
            case CENTRAL_CONTROL_ACCOUNT_GROUP -> central(targetType, targetId, "select id from central_control_account_group where id = ? and status <> 'DELETED'");
            case CENTRAL_CONTROL_OBJECTIVE_ACCOUNT_GROUP -> central(targetType, targetId, "select id from central_control_objective_account_group where id = ? and status <> 'DELETED'");
            case CENTRAL_SUBPROCESS_RISK_CONTROL_COVERAGE -> central(targetType, targetId, "select id from central_subprocess_risk_control_coverage where id = ? and status <> 'DELETED'");
            case CENTRAL_SUBPROCESS_RISK_CONTROL_OBJECTIVE_COVERAGE -> central(targetType, targetId, "select id from central_subprocess_risk_control_objective_coverage where id = ? and status <> 'DELETED'");
            case CENTRAL_SUBPROCESS_CONTROL_CONTROL_OBJECTIVE_COVERAGE -> central(targetType, targetId, "select id from central_subprocess_control_control_objective_coverage where id = ? and status <> 'DELETED'");
            case CENTRAL_SUBPROCESS_REQUIREMENT_CONTROL_COVERAGE -> central(targetType, targetId, "select id from central_subprocess_requirement_control_coverage where id = ? and status <> 'DELETED'");
            case LOCAL_ORGANIZATION_SUBPROCESS_SCOPE -> local(targetType, targetId,
                    "select organization_id from local_organization_subprocess_scope where id = ? and status <> 'DELETED'");
            case LOCAL_SUBPROCESS_CONTROL_SCOPE -> local(targetType, targetId,
                    "select ctx.organization_id from local_subprocess_control_scope target join local_organization_subprocess_scope ctx on ctx.id = target.organization_subprocess_scope_id where target.id = ? and target.status <> 'DELETED' and ctx.status <> 'DELETED'");
            case LOCAL_SUBPROCESS_RISK_SCOPE -> local(targetType, targetId,
                    "select ctx.organization_id from local_subprocess_risk_scope target join local_organization_subprocess_scope ctx on ctx.id = target.organization_subprocess_scope_id where target.id = ? and target.status <> 'DELETED' and ctx.status <> 'DELETED'");
            case LOCAL_SUBPROCESS_CONTROL_OBJECTIVE_SCOPE -> local(targetType, targetId,
                    "select ctx.organization_id from local_subprocess_control_objective_scope target join local_organization_subprocess_scope ctx on ctx.id = target.organization_subprocess_scope_id where target.id = ? and target.status <> 'DELETED' and ctx.status <> 'DELETED'");
            case LOCAL_SUBPROCESS_REQUIREMENT_SCOPE -> local(targetType, targetId,
                    "select ctx.organization_id from local_subprocess_requirement_scope target join local_organization_subprocess_scope ctx on ctx.id = target.organization_subprocess_scope_id where target.id = ? and target.status <> 'DELETED' and ctx.status <> 'DELETED'");
            case LOCAL_SUBPROCESS_RISK_CONTROL_COVERAGE -> local(targetType, targetId,
                    "select ctx.organization_id from local_subprocess_risk_control_coverage target join local_organization_subprocess_scope ctx on ctx.id = target.organization_subprocess_scope_id where target.id = ? and target.status <> 'DELETED' and ctx.status <> 'DELETED'");
            case LOCAL_SUBPROCESS_RISK_CONTROL_OBJECTIVE_COVERAGE -> local(targetType, targetId,
                    "select ctx.organization_id from local_subprocess_risk_control_objective_coverage target join local_organization_subprocess_scope ctx on ctx.id = target.organization_subprocess_scope_id where target.id = ? and target.status <> 'DELETED' and ctx.status <> 'DELETED'");
            case LOCAL_SUBPROCESS_CONTROL_CONTROL_OBJECTIVE_COVERAGE -> local(targetType, targetId,
                    "select ctx.organization_id from local_subprocess_control_control_objective_coverage target join local_organization_subprocess_scope ctx on ctx.id = target.organization_subprocess_scope_id where target.id = ? and target.status <> 'DELETED' and ctx.status <> 'DELETED'");
            case LOCAL_SUBPROCESS_REQUIREMENT_CONTROL_COVERAGE -> local(targetType, targetId,
                    "select ctx.organization_id from local_subprocess_requirement_control_coverage target join local_organization_subprocess_scope ctx on ctx.id = target.organization_subprocess_scope_id where target.id = ? and target.status <> 'DELETED' and ctx.status <> 'DELETED'");
            case LOCAL_POLICY_ORGANIZATION_SCOPE -> local(targetType, targetId,
                    "select organization_id from local_policy_organization_scope where id = ? and status <> 'DELETED'");
            case LOCAL_POLICY_SUBPROCESS_SCOPE -> local(targetType, targetId,
                    "select ctx.organization_id from local_policy_subprocess_scope target join local_organization_subprocess_scope ctx on ctx.id = target.organization_subprocess_scope_id where target.id = ? and target.status <> 'DELETED' and ctx.status <> 'DELETED'");
            case LOCAL_POLICY_CONTROL_SCOPE -> local(targetType, targetId,
                    "select ctx.organization_id from local_policy_control_scope target join local_subprocess_control_scope control_scope on control_scope.id = target.local_control_scope_id join local_organization_subprocess_scope ctx on ctx.id = control_scope.organization_subprocess_scope_id where target.id = ? and target.status <> 'DELETED' and control_scope.status <> 'DELETED' and ctx.status <> 'DELETED'");
            case LOCAL_POLICY_REQUIREMENT_SCOPE -> local(targetType, targetId,
                    "select ctx.organization_id from local_policy_requirement_scope target join local_subprocess_requirement_scope requirement_scope on requirement_scope.id = target.local_requirement_scope_id join local_organization_subprocess_scope ctx on ctx.id = requirement_scope.organization_subprocess_scope_id where target.id = ? and target.status <> 'DELETED' and requirement_scope.status <> 'DELETED' and ctx.status <> 'DELETED'");
            case MASTERDATA_REVISION -> throw DocumentFailures.invalid("TARGET_NOT_ALLOWED", "Document link target type is not allowed from browser requests");
        };
    }

    @Override
    public DocumentTargetContext sameRevisionEvidence(RevisionExecutionContext context) {
        Objects.requireNonNull(context, "context is required");
        if (!context.isDraft()) {
            throw DocumentFailures.conflict("MASTERDATA_REVISION_REQUIRED", "Same-revision document evidence requires a draft revision context");
        }
        return new DocumentTargetContext(
                DocumentLinkTargetType.MASTERDATA_REVISION,
                context.revisionId(),
                context.domain(),
                context.organizationId(),
                DocumentLinkTargetType.MASTERDATA_REVISION.wireValue(),
                context.revisionId()
        );
    }

    private DocumentTargetContext central(DocumentLinkTargetType targetType, UUID targetId, String sql) {
        Optional<UUID> existing = queryUuid(sql, targetId);
        if (existing.isEmpty()) {
            throw DocumentFailures.notFound("TARGET_NOT_FOUND", "Document link target was not found");
        }
        return new DocumentTargetContext(
                targetType,
                targetId,
                RevisionDomain.CENTRAL,
                null,
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
                RevisionDomain.LOCAL,
                organizationId,
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
