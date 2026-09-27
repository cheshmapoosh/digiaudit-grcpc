package com.digiaudit.grcpc.modules.document.infrastructure.target;

import com.digiaudit.grcpc.modules.document.application.DocumentFailures;
import com.digiaudit.grcpc.modules.document.application.DocumentTargetContextResolver;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import com.digiaudit.grcpc.modules.document.domain.DocumentTargetContext;
import java.sql.PreparedStatement;
import java.util.Objects;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

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
      throw DocumentFailures.invalid(
          "TARGET_NOT_ALLOWED", "Document link target type is not allowed from browser requests");
    }
    return switch (targetType) {
      case ORGANIZATION ->
          central(
              targetType,
              targetId,
              "select id from organization where id = ? and status <> 'DELETED'");
      case CENTRAL_PROCESS ->
          central(
              targetType,
              targetId,
              "select id from central_process where id = ? and status <> 'DELETED'");
      case CENTRAL_SUBPROCESS ->
          central(
              targetType,
              targetId,
              "select id from central_subprocess where id = ? and status <> 'DELETED'");
      case CENTRAL_CONTROL ->
          central(
              targetType,
              targetId,
              "select id from central_control where id = ? and status <> 'DELETED'");
      case CENTRAL_CONTROL_OBJECTIVE ->
          central(
              targetType,
              targetId,
              "select id from central_control_objective where id = ? and status <> 'DELETED'");
      case CENTRAL_RISK_CATEGORY ->
          central(
              targetType,
              targetId,
              "select id from central_risk_category where id = ? and status <> 'DELETED'");
      case CENTRAL_RISK_TEMPLATE ->
          central(
              targetType,
              targetId,
              "select id from central_risk_template where id = ? and status <> 'DELETED'");
      case CENTRAL_ACCOUNT_GROUP ->
          central(
              targetType,
              targetId,
              "select id from central_account_group where id = ? and status <> 'DELETED'");
      case CENTRAL_REGULATION_GROUP ->
          central(
              targetType,
              targetId,
              "select id from central_regulation_group where id = ? and status <> 'DELETED'");
      case CENTRAL_REGULATION ->
          central(
              targetType,
              targetId,
              "select id from central_regulation where id = ? and status <> 'DELETED'");
      case CENTRAL_REGULATION_REQUIREMENT ->
          central(
              targetType,
              targetId,
              "select id from central_regulation_requirement where id = ? and status <> 'DELETED'");
      case CENTRAL_POLICY_GROUP ->
          central(
              targetType,
              targetId,
              "select id from central_policy_group where id = ? and status <> 'DELETED'");
      case CENTRAL_POLICY ->
          central(
              targetType,
              targetId,
              "select id from central_policy where id = ? and status <> 'DELETED'");
      case LOCAL_ORGANIZATION_SUBPROCESS_SCOPE -> local(targetType, targetId, "select c.organization_id from local_organization_subprocess_scope c where c.id = ? and c.status <> 'DELETED'");
      case LOCAL_SUBPROCESS_CONTROL_SCOPE -> local(targetType, targetId, "select c.organization_id from local_subprocess_control_scope s join local_organization_subprocess_scope c on c.id = s.organization_subprocess_scope_id where s.id = ? and s.status <> 'DELETED'");
      case LOCAL_SUBPROCESS_RISK_SCOPE -> local(targetType, targetId, "select c.organization_id from local_subprocess_risk_scope s join local_organization_subprocess_scope c on c.id = s.organization_subprocess_scope_id where s.id = ? and s.status <> 'DELETED'");
      case LOCAL_SUBPROCESS_CONTROL_OBJECTIVE_SCOPE -> local(targetType, targetId, "select c.organization_id from local_subprocess_control_objective_scope s join local_organization_subprocess_scope c on c.id = s.organization_subprocess_scope_id where s.id = ? and s.status <> 'DELETED'");
      case LOCAL_SUBPROCESS_REQUIREMENT_SCOPE -> local(targetType, targetId, "select c.organization_id from local_subprocess_requirement_scope s join local_organization_subprocess_scope c on c.id = s.organization_subprocess_scope_id where s.id = ? and s.status <> 'DELETED'");
      case LOCAL_SUBPROCESS_RISK_CONTROL_COVERAGE -> local(targetType, targetId, "select c.organization_id from local_subprocess_risk_control_coverage v join local_organization_subprocess_scope c on c.id = v.organization_subprocess_scope_id join local_subprocess_risk_scope r on r.id = v.local_risk_scope_id and r.organization_subprocess_scope_id = c.id join local_subprocess_control_scope x on x.id = v.local_control_scope_id and x.organization_subprocess_scope_id = c.id where v.id = ? and v.status <> 'DELETED'");
      case LOCAL_SUBPROCESS_RISK_CONTROL_OBJECTIVE_COVERAGE -> local(targetType, targetId, "select c.organization_id from local_subprocess_risk_control_objective_coverage v join local_organization_subprocess_scope c on c.id = v.organization_subprocess_scope_id join local_subprocess_risk_scope r on r.id = v.local_risk_scope_id and r.organization_subprocess_scope_id = c.id join local_subprocess_control_objective_scope x on x.id = v.local_control_objective_scope_id and x.organization_subprocess_scope_id = c.id where v.id = ? and v.status <> 'DELETED'");
      case LOCAL_SUBPROCESS_CONTROL_CONTROL_OBJECTIVE_COVERAGE -> local(targetType, targetId, "select c.organization_id from local_subprocess_control_control_objective_coverage v join local_organization_subprocess_scope c on c.id = v.organization_subprocess_scope_id join local_subprocess_control_scope r on r.id = v.local_control_scope_id and r.organization_subprocess_scope_id = c.id join local_subprocess_control_objective_scope x on x.id = v.local_control_objective_scope_id and x.organization_subprocess_scope_id = c.id where v.id = ? and v.status <> 'DELETED'");
      case LOCAL_SUBPROCESS_REQUIREMENT_CONTROL_COVERAGE -> local(targetType, targetId, "select c.organization_id from local_subprocess_requirement_control_coverage v join local_organization_subprocess_scope c on c.id = v.organization_subprocess_scope_id join local_subprocess_requirement_scope r on r.id = v.local_requirement_scope_id and r.organization_subprocess_scope_id = c.id join local_subprocess_control_scope x on x.id = v.local_control_scope_id and x.organization_subprocess_scope_id = c.id where v.id = ? and v.status <> 'DELETED'");
      case LOCAL_POLICY_ORGANIZATION_SCOPE -> local(targetType, targetId, "select p.organization_id from local_policy_organization_scope p where p.id = ? and p.status <> 'DELETED'");
      case LOCAL_POLICY_SUBPROCESS_SCOPE -> local(targetType, targetId, "select c.organization_id from local_policy_subprocess_scope p join local_organization_subprocess_scope c on c.id = p.organization_subprocess_scope_id where p.id = ? and p.status <> 'DELETED'");
      case LOCAL_POLICY_CONTROL_SCOPE -> local(targetType, targetId, "select c.organization_id from local_policy_control_scope p join local_subprocess_control_scope s on s.id = p.local_control_scope_id join local_organization_subprocess_scope c on c.id = s.organization_subprocess_scope_id where p.id = ? and p.status <> 'DELETED'");
      case LOCAL_POLICY_REQUIREMENT_SCOPE -> local(targetType, targetId, "select c.organization_id from local_policy_requirement_scope p join local_subprocess_requirement_scope s on s.id = p.local_requirement_scope_id join local_organization_subprocess_scope c on c.id = s.organization_subprocess_scope_id where p.id = ? and p.status <> 'DELETED'");
      case CENTRAL_SUBPROCESS_CONTROL_SCOPE,
              CENTRAL_SUBPROCESS_RISK_SCOPE,
              CENTRAL_SUBPROCESS_CONTROL_OBJECTIVE_SCOPE,
              CENTRAL_SUBPROCESS_REQUIREMENT_SCOPE,
              CENTRAL_POLICY_SUBPROCESS_SCOPE,
              CENTRAL_POLICY_ORGANIZATION_SCOPE,
              CENTRAL_POLICY_CONTROL_SCOPE,
              CENTRAL_POLICY_REQUIREMENT_SCOPE,
              CENTRAL_CONTROL_ACCOUNT_GROUP,
              CENTRAL_CONTROL_OBJECTIVE_ACCOUNT_GROUP,
              CENTRAL_SUBPROCESS_RISK_CONTROL_COVERAGE,
              CENTRAL_SUBPROCESS_RISK_CONTROL_OBJECTIVE_COVERAGE,
              CENTRAL_SUBPROCESS_CONTROL_CONTROL_OBJECTIVE_COVERAGE,
              CENTRAL_SUBPROCESS_REQUIREMENT_CONTROL_COVERAGE ->
          throw targetNotAvailable();
      case MASTERDATA_REVISION ->
          throw DocumentFailures.invalid(
              "TARGET_NOT_ALLOWED",
              "Document link target type is not allowed from browser requests");
    };
  }

  @Override
  public void assertMutable(DocumentLinkTargetType targetType, UUID targetId) {
    String sql =
        switch (targetType) {
          case ORGANIZATION ->
              "select id from organization where id = ? and status <> 'DELETED' for update";
          case CENTRAL_PROCESS ->
              "select id from central_process where id = ? and status <> 'DELETED' for update";
          case CENTRAL_SUBPROCESS ->
              "select id from central_subprocess where id = ? and status <> 'DELETED' for update";
          case CENTRAL_CONTROL ->
              "select id from central_control where id = ? and status <> 'DELETED' for update";
          case CENTRAL_CONTROL_OBJECTIVE ->
              "select id from central_control_objective where id = ? and status <> 'DELETED' for"
                  + " update";
          case CENTRAL_RISK_CATEGORY ->
              "select id from central_risk_category where id = ? and status <> 'DELETED' for"
                  + " update";
          case CENTRAL_RISK_TEMPLATE ->
              "select id from central_risk_template where id = ? and status <> 'DELETED' for"
                  + " update";
          case CENTRAL_ACCOUNT_GROUP ->
              "select id from central_account_group where id = ? and status <> 'DELETED' for"
                  + " update";
          case CENTRAL_REGULATION_GROUP ->
              "select id from central_regulation_group where id = ? and status <> 'DELETED' for"
                  + " update";
          case CENTRAL_REGULATION ->
              "select id from central_regulation where id = ? and status <> 'DELETED' for update";
          case CENTRAL_REGULATION_REQUIREMENT ->
              "select id from central_regulation_requirement where id = ? and status <> 'DELETED'"
                  + " for update";
          case CENTRAL_POLICY_GROUP ->
              "select id from central_policy_group where id = ? and status <> 'DELETED' for update";
          case CENTRAL_POLICY ->
              "select id from central_policy where id = ? and status <> 'DELETED' for update";
          case LOCAL_ORGANIZATION_SUBPROCESS_SCOPE -> "select c.id from local_organization_subprocess_scope c where c.id = ? and c.status <> 'DELETED' for update of c.id";
          case LOCAL_SUBPROCESS_CONTROL_SCOPE -> "select s.id from local_subprocess_control_scope s join local_organization_subprocess_scope c on c.id = s.organization_subprocess_scope_id where s.id = ? and s.status <> 'DELETED' for update of s.id";
          case LOCAL_SUBPROCESS_RISK_SCOPE -> "select s.id from local_subprocess_risk_scope s join local_organization_subprocess_scope c on c.id = s.organization_subprocess_scope_id where s.id = ? and s.status <> 'DELETED' for update of s.id";
          case LOCAL_SUBPROCESS_CONTROL_OBJECTIVE_SCOPE -> "select s.id from local_subprocess_control_objective_scope s join local_organization_subprocess_scope c on c.id = s.organization_subprocess_scope_id where s.id = ? and s.status <> 'DELETED' for update of s.id";
          case LOCAL_SUBPROCESS_REQUIREMENT_SCOPE -> "select s.id from local_subprocess_requirement_scope s join local_organization_subprocess_scope c on c.id = s.organization_subprocess_scope_id where s.id = ? and s.status <> 'DELETED' for update of s.id";
          case LOCAL_SUBPROCESS_RISK_CONTROL_COVERAGE -> "select v.id from local_subprocess_risk_control_coverage v join local_organization_subprocess_scope c on c.id = v.organization_subprocess_scope_id join local_subprocess_risk_scope r on r.id = v.local_risk_scope_id and r.organization_subprocess_scope_id = c.id join local_subprocess_control_scope x on x.id = v.local_control_scope_id and x.organization_subprocess_scope_id = c.id where v.id = ? and v.status <> 'DELETED' for update of v.id";
          case LOCAL_SUBPROCESS_RISK_CONTROL_OBJECTIVE_COVERAGE -> "select v.id from local_subprocess_risk_control_objective_coverage v join local_organization_subprocess_scope c on c.id = v.organization_subprocess_scope_id join local_subprocess_risk_scope r on r.id = v.local_risk_scope_id and r.organization_subprocess_scope_id = c.id join local_subprocess_control_objective_scope x on x.id = v.local_control_objective_scope_id and x.organization_subprocess_scope_id = c.id where v.id = ? and v.status <> 'DELETED' for update of v.id";
          case LOCAL_SUBPROCESS_CONTROL_CONTROL_OBJECTIVE_COVERAGE -> "select v.id from local_subprocess_control_control_objective_coverage v join local_organization_subprocess_scope c on c.id = v.organization_subprocess_scope_id join local_subprocess_control_scope r on r.id = v.local_control_scope_id and r.organization_subprocess_scope_id = c.id join local_subprocess_control_objective_scope x on x.id = v.local_control_objective_scope_id and x.organization_subprocess_scope_id = c.id where v.id = ? and v.status <> 'DELETED' for update of v.id";
          case LOCAL_SUBPROCESS_REQUIREMENT_CONTROL_COVERAGE -> "select v.id from local_subprocess_requirement_control_coverage v join local_organization_subprocess_scope c on c.id = v.organization_subprocess_scope_id join local_subprocess_requirement_scope r on r.id = v.local_requirement_scope_id and r.organization_subprocess_scope_id = c.id join local_subprocess_control_scope x on x.id = v.local_control_scope_id and x.organization_subprocess_scope_id = c.id where v.id = ? and v.status <> 'DELETED' for update of v.id";
          case LOCAL_POLICY_ORGANIZATION_SCOPE -> "select p.id from local_policy_organization_scope p where p.id = ? and p.status <> 'DELETED' for update of p.id";
          case LOCAL_POLICY_SUBPROCESS_SCOPE -> "select p.id from local_policy_subprocess_scope p join local_organization_subprocess_scope c on c.id = p.organization_subprocess_scope_id where p.id = ? and p.status <> 'DELETED' for update of p.id";
          case LOCAL_POLICY_CONTROL_SCOPE -> "select p.id from local_policy_control_scope p join local_subprocess_control_scope s on s.id = p.local_control_scope_id join local_organization_subprocess_scope c on c.id = s.organization_subprocess_scope_id where p.id = ? and p.status <> 'DELETED' for update of p.id";
          case LOCAL_POLICY_REQUIREMENT_SCOPE -> "select p.id from local_policy_requirement_scope p join local_subprocess_requirement_scope s on s.id = p.local_requirement_scope_id join local_organization_subprocess_scope c on c.id = s.organization_subprocess_scope_id where p.id = ? and p.status <> 'DELETED' for update of p.id";
          case CENTRAL_SUBPROCESS_CONTROL_SCOPE,
                  CENTRAL_SUBPROCESS_RISK_SCOPE,
                  CENTRAL_SUBPROCESS_CONTROL_OBJECTIVE_SCOPE,
                  CENTRAL_SUBPROCESS_REQUIREMENT_SCOPE,
                  CENTRAL_POLICY_SUBPROCESS_SCOPE,
                  CENTRAL_POLICY_ORGANIZATION_SCOPE,
                  CENTRAL_POLICY_CONTROL_SCOPE,
                  CENTRAL_POLICY_REQUIREMENT_SCOPE,
                  CENTRAL_CONTROL_ACCOUNT_GROUP,
                  CENTRAL_CONTROL_OBJECTIVE_ACCOUNT_GROUP,
                  CENTRAL_SUBPROCESS_RISK_CONTROL_COVERAGE,
                  CENTRAL_SUBPROCESS_RISK_CONTROL_OBJECTIVE_COVERAGE,
                  CENTRAL_SUBPROCESS_CONTROL_CONTROL_OBJECTIVE_COVERAGE,
                  CENTRAL_SUBPROCESS_REQUIREMENT_CONTROL_COVERAGE ->
              throw targetNotAvailable();
          case MASTERDATA_REVISION ->
              throw DocumentFailures.invalid(
                  "TARGET_NOT_ALLOWED",
                  "Document link target type is not allowed from browser requests");
        };
    if (queryUuid(sql, targetId).isPresent()) {
      return;
    }
    throw DocumentFailures.notFound("TARGET_NOT_FOUND", "Document link target was not found");
  }


  private DocumentTargetContext central(
      DocumentLinkTargetType targetType, UUID targetId, String sql) {
    Optional<UUID> existing = queryUuid(sql, targetId);
    if (existing.isEmpty()) {
      throw DocumentFailures.notFound("TARGET_NOT_FOUND", "Document link target was not found");
    }
    return new DocumentTargetContext(targetType, targetId, targetType.wireValue(), targetId);
  }

  private DocumentTargetContext local(
      DocumentLinkTargetType targetType, UUID targetId, String sql) {
    UUID organizationId =
        queryUuid(sql, targetId)
            .orElseThrow(
                () ->
                    DocumentFailures.notFound(
                        "TARGET_NOT_FOUND", "Document link target was not found"));
    return new DocumentTargetContext(targetType, targetId, targetType.wireValue(), targetId);
  }

  private Optional<UUID> queryUuid(String sql, UUID id) {
    return jdbcTemplate.query(
        connection -> {
          PreparedStatement statement = connection.prepareStatement(sql);
          statement.setBytes(1, OracleRawUuid.toBytes(id));
          return statement;
        },
        resultSet -> {
          if (!resultSet.next()) {
            return Optional.empty();
          }
          return Optional.of(OracleRawUuid.fromBytes(resultSet.getBytes(1)));
        });
  }


  private RuntimeException targetNotAvailable() {
    return DocumentFailures.invalid(
        "TARGET_NOT_AVAILABLE", "Document target runtime is not available yet");
  }

}
