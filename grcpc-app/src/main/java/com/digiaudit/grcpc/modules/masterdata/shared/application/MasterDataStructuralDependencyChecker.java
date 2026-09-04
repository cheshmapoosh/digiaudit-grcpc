package com.digiaudit.grcpc.modules.masterdata.shared.application;

import java.nio.ByteBuffer;
import java.sql.PreparedStatement;
import java.util.List;
import java.util.Objects;
import java.util.UUID;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class MasterDataStructuralDependencyChecker {
  private static final List<String> ORGANIZATION_DEPENDENCY_QUERIES =
      List.of(
          "select count(*) from local_organization_subprocess_scope where organization_id = ?",
          "select count(*) from local_policy_organization_scope where organization_id = ?");
  private static final List<String> CENTRAL_PROCESS_DEPENDENCY_QUERIES =
      List.of(
          "select count(*) from central_process where parent_process_id = ? and status <>"
              + " 'DELETED'",
          "select count(*) from central_subprocess where process_id = ? and status <> 'DELETED'");
  private static final List<String> CENTRAL_SUBPROCESS_DEPENDENCY_QUERIES =
      List.of(
          "select count(*) from central_subprocess_control_scope where subprocess_id = ?",
          "select count(*) from central_subprocess_risk_scope where subprocess_id = ?",
          "select count(*) from central_subprocess_control_objective_scope where subprocess_id = ?",
          "select count(*) from central_subprocess_requirement_scope where subprocess_id = ?",
          "select count(*) from central_policy_version_subprocess_scope where subprocess_id = ?",
          "select count(*) from local_organization_subprocess_scope where subprocess_id = ?");
  private static final List<String> CENTRAL_CONTROL_DEPENDENCY_QUERIES =
      List.of(
          "select count(*) from central_subprocess_control_scope where control_id = ?",
          "select count(*) from local_subprocess_control_scope where control_id = ?",
          "select count(*) from central_control_account_group where control_id = ?");
  private static final List<String> CENTRAL_CONTROL_OBJECTIVE_DEPENDENCY_QUERIES =
      List.of(
          "select count(*) from central_subprocess_control_objective_scope where"
              + " control_objective_id = ?",
          "select count(*) from local_subprocess_control_objective_scope where control_objective_id"
              + " = ?",
          "select count(*) from central_control_objective_account_group where control_objective_id"
              + " = ?");
  private static final List<String> CENTRAL_RISK_TEMPLATE_DEPENDENCY_QUERIES =
      List.of(
          "select count(*) from central_subprocess_risk_scope where risk_template_id = ?",
          "select count(*) from local_subprocess_risk_scope where risk_template_id = ?");
  private static final List<String> CENTRAL_ACCOUNT_GROUP_DEPENDENCY_QUERIES =
      List.of(
          "select count(*) from central_control_account_group where account_group_id = ?",
          "select count(*) from central_control_objective_account_group where account_group_id ="
              + " ?");
  private static final List<String> CENTRAL_REQUIREMENT_DEPENDENCY_QUERIES =
      List.of(
          "select count(*) from central_subprocess_requirement_scope where requirement_id = ?",
          "select count(*) from local_subprocess_requirement_scope where requirement_id = ?");
  private static final List<String> CENTRAL_POLICY_VERSION_DEPENDENCY_QUERIES =
      List.of(
          "select count(*) from central_policy_version_subprocess_scope where policy_version_id ="
              + " ?",
          "select count(*) from central_policy_version_control_scope where policy_version_id = ?",
          "select count(*) from central_policy_version_requirement_scope where policy_version_id ="
              + " ?",
          "select count(*) from local_policy_organization_scope where policy_version_id = ?",
          "select count(*) from local_policy_subprocess_scope where policy_version_id = ?",
          "select count(*) from local_policy_control_scope where policy_version_id = ?",
          "select count(*) from local_policy_requirement_scope where policy_version_id = ?");
  private static final List<String> CENTRAL_CONTROL_SCOPE_DEPENDENCY_QUERIES =
      List.of(
          "select count(*) from central_policy_version_control_scope where central_control_scope_id"
              + " = ? and status <> 'DELETED'",
          "select count(*) from central_subprocess_risk_control_coverage where control_scope_id = ?"
              + " and status <> 'DELETED'",
          "select count(*) from central_subprocess_control_control_objective_coverage where"
              + " control_scope_id = ? and status <> 'DELETED'",
          "select count(*) from central_subprocess_requirement_control_coverage where"
              + " control_scope_id = ? and status <> 'DELETED'",
          "select count(*) from local_subprocess_control_scope where central_control_scope_id = ?"
              + " and status <> 'DELETED'");
  private static final List<String> CENTRAL_RISK_SCOPE_DEPENDENCY_QUERIES =
      List.of(
          "select count(*) from central_subprocess_risk_control_coverage where risk_scope_id = ?"
              + " and status <> 'DELETED'",
          "select count(*) from central_subprocess_risk_control_objective_coverage where"
              + " risk_scope_id = ? and status <> 'DELETED'",
          "select count(*) from local_subprocess_risk_scope where central_risk_scope_id = ?"
              + " and status <> 'DELETED'");
  private static final List<String> CENTRAL_CONTROL_OBJECTIVE_SCOPE_DEPENDENCY_QUERIES =
      List.of(
          "select count(*) from central_subprocess_risk_control_objective_coverage where"
              + " control_objective_scope_id = ? and status <> 'DELETED'",
          "select count(*) from central_subprocess_control_control_objective_coverage where"
              + " control_objective_scope_id = ? and status <> 'DELETED'",
          "select count(*) from local_subprocess_control_objective_scope where"
              + " central_control_objective_scope_id = ? and status <> 'DELETED'");

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

  public boolean centralControlHasApprovedDependencies(UUID controlId) {
    return anyExists(CENTRAL_CONTROL_DEPENDENCY_QUERIES, controlId);
  }

  public boolean centralControlObjectiveHasApprovedDependencies(UUID objectiveId) {
    return anyExists(CENTRAL_CONTROL_OBJECTIVE_DEPENDENCY_QUERIES, objectiveId);
  }

  public boolean centralRiskTemplateHasApprovedDependencies(UUID templateId) {
    return anyExists(CENTRAL_RISK_TEMPLATE_DEPENDENCY_QUERIES, templateId);
  }

  public boolean centralAccountGroupHasApprovedDependencies(UUID accountGroupId) {
    return anyExists(CENTRAL_ACCOUNT_GROUP_DEPENDENCY_QUERIES, accountGroupId);
  }

  public boolean centralRegulationRequirementHasApprovedDependencies(UUID requirementId) {
    return anyExists(CENTRAL_REQUIREMENT_DEPENDENCY_QUERIES, requirementId);
  }

  public boolean centralPolicyVersionHasApprovedDependencies(UUID policyVersionId) {
    return anyExists(CENTRAL_POLICY_VERSION_DEPENDENCY_QUERIES, policyVersionId);
  }

  public boolean centralControlScopeHasLiveDependencies(UUID scopeId) {
    return anyExists(CENTRAL_CONTROL_SCOPE_DEPENDENCY_QUERIES, scopeId);
  }

  public boolean centralRiskScopeHasLiveDependencies(UUID scopeId) {
    return anyExists(CENTRAL_RISK_SCOPE_DEPENDENCY_QUERIES, scopeId);
  }

  public boolean centralControlObjectiveScopeHasLiveDependencies(UUID scopeId) {
    return anyExists(CENTRAL_CONTROL_OBJECTIVE_SCOPE_DEPENDENCY_QUERIES, scopeId);
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
    return Boolean.TRUE.equals(
        jdbcTemplate.query(
            connection -> {
              PreparedStatement statement = connection.prepareStatement(sql);
              statement.setBytes(1, toBytes(id));
              return statement;
            },
            resultSet -> resultSet.next() && resultSet.getLong(1) > 0L));
  }

  private static byte[] toBytes(UUID uuid) {
    ByteBuffer buffer = ByteBuffer.allocate(16);
    buffer.putLong(uuid.getMostSignificantBits());
    buffer.putLong(uuid.getLeastSignificantBits());
    return buffer.array();
  }
}
