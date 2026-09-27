package com.digiaudit.grcpc.modules.masterdata.local.application;

import com.digiaudit.grcpc.modules.masterdata.local.api.dto.*;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.nio.ByteBuffer;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class LocalReverseService {
  private final LocalCommandRules rules;
  private final NamedParameterJdbcTemplate jdbc;
  private final LocalRiskService riskScopesService;
  private final LocalObjectiveService objectiveScopesService;
  private final LocalRequirementService requirementScopesService;
  private final LocalOrganizationPolicyService organizationPoliciesService;
  private final LocalContextPolicyService contextPoliciesService;
  private final LocalControlPolicyService controlPoliciesService;
  private final LocalRequirementPolicyService requirementPoliciesService;

  public LocalReverseService(LocalCommandRules rules, NamedParameterJdbcTemplate jdbc,
      LocalRiskService riskScopesService,
      LocalObjectiveService objectiveScopesService,
      LocalRequirementService requirementScopesService,
      LocalOrganizationPolicyService organizationPoliciesService,
      LocalContextPolicyService contextPoliciesService,
      LocalControlPolicyService controlPoliciesService,
      LocalRequirementPolicyService requirementPoliciesService) {
    this.rules = rules;
    this.jdbc = jdbc;
    this.riskScopesService = riskScopesService;
    this.objectiveScopesService = objectiveScopesService;
    this.requirementScopesService = requirementScopesService;
    this.organizationPoliciesService = organizationPoliciesService;
    this.contextPoliciesService = contextPoliciesService;
    this.controlPoliciesService = controlPoliciesService;
    this.requirementPoliciesService = requirementPoliciesService;
  }

  public LocalRiskDtos.Page riskScopes(UUID parentId, UUID organizationId,
      MasterDataLifecycleStatus lifecycleStatus, int page, int size, String sort, String direction) {
    rules.requireView("PROCESS", "RISK");
    var keys = keys("select x.id, x.organization_subprocess_scope_id target_id from local_subprocess_risk_scope x join local_organization_subprocess_scope c on c.id = x.organization_subprocess_scope_id",
        "risk_template_id", "c.organization_id", parentId, organizationId,
        lifecycleStatus, page, size, sort, direction);
    return new LocalRiskDtos.Page(keys.items().stream()
        .map(key -> riskScopesService.detail(key.targetId(), key.id(), organizationId))
        .toList(), page, size, keys.totalElements(), keys.totalPages());
  }

  public LocalObjectiveDtos.Page objectiveScopes(UUID parentId, UUID organizationId,
      MasterDataLifecycleStatus lifecycleStatus, int page, int size, String sort, String direction) {
    rules.requireView("PROCESS", "CONTROL");
    var keys = keys("select x.id, x.organization_subprocess_scope_id target_id from local_subprocess_control_objective_scope x join local_organization_subprocess_scope c on c.id = x.organization_subprocess_scope_id",
        "control_objective_id", "c.organization_id", parentId, organizationId,
        lifecycleStatus, page, size, sort, direction);
    return new LocalObjectiveDtos.Page(keys.items().stream()
        .map(key -> objectiveScopesService.detail(key.targetId(), key.id(), organizationId))
        .toList(), page, size, keys.totalElements(), keys.totalPages());
  }

  public LocalRequirementDtos.Page requirementScopes(UUID parentId, UUID organizationId,
      MasterDataLifecycleStatus lifecycleStatus, int page, int size, String sort, String direction) {
    rules.requireView("PROCESS", "GOVERNANCE");
    var keys = keys("select x.id, x.organization_subprocess_scope_id target_id from local_subprocess_requirement_scope x join local_organization_subprocess_scope c on c.id = x.organization_subprocess_scope_id",
        "requirement_id", "c.organization_id", parentId, organizationId,
        lifecycleStatus, page, size, sort, direction);
    return new LocalRequirementDtos.Page(keys.items().stream()
        .map(key -> requirementScopesService.detail(key.targetId(), key.id(), organizationId))
        .toList(), page, size, keys.totalElements(), keys.totalPages());
  }

  public LocalOrganizationPolicyDtos.Page organizationPolicies(UUID parentId, UUID organizationId,
      MasterDataLifecycleStatus lifecycleStatus, int page, int size, String sort, String direction) {
    rules.requireView("GOVERNANCE");
    var keys = keys("select x.id, x.organization_id target_id from local_policy_organization_scope x ",
        "policy_id", "x.organization_id", parentId, organizationId,
        lifecycleStatus, page, size, sort, direction);
    return new LocalOrganizationPolicyDtos.Page(keys.items().stream()
        .map(key -> organizationPoliciesService.detail(key.id(), organizationId))
        .toList(), page, size, keys.totalElements(), keys.totalPages());
  }

  public LocalContextPolicyDtos.Page contextPolicies(UUID parentId, UUID organizationId,
      MasterDataLifecycleStatus lifecycleStatus, int page, int size, String sort, String direction) {
    rules.requireView("PROCESS", "GOVERNANCE");
    var keys = keys("select x.id, x.organization_subprocess_scope_id target_id from local_policy_subprocess_scope x join local_organization_subprocess_scope c on c.id = x.organization_subprocess_scope_id",
        "policy_id", "c.organization_id", parentId, organizationId,
        lifecycleStatus, page, size, sort, direction);
    return new LocalContextPolicyDtos.Page(keys.items().stream()
        .map(key -> contextPoliciesService.detail(key.targetId(), key.id(), organizationId))
        .toList(), page, size, keys.totalElements(), keys.totalPages());
  }

  public LocalControlPolicyDtos.Page controlPolicies(UUID parentId, UUID organizationId,
      MasterDataLifecycleStatus lifecycleStatus, int page, int size, String sort, String direction) {
    rules.requireView("PROCESS", "CONTROL", "GOVERNANCE");
    var keys = keys("select x.id, x.local_control_scope_id target_id from local_policy_control_scope x join local_subprocess_control_scope s on s.id = x.local_control_scope_id join local_organization_subprocess_scope c on c.id = s.organization_subprocess_scope_id",
        "policy_id", "c.organization_id", parentId, organizationId,
        lifecycleStatus, page, size, sort, direction);
    return new LocalControlPolicyDtos.Page(keys.items().stream()
        .map(key -> controlPoliciesService.detail(key.targetId(), key.id(), organizationId))
        .toList(), page, size, keys.totalElements(), keys.totalPages());
  }

  public LocalRequirementPolicyDtos.Page requirementPolicies(UUID parentId, UUID organizationId,
      MasterDataLifecycleStatus lifecycleStatus, int page, int size, String sort, String direction) {
    rules.requireView("PROCESS", "GOVERNANCE");
    var keys = keys("select x.id, x.local_requirement_scope_id target_id from local_policy_requirement_scope x join local_subprocess_requirement_scope s on s.id = x.local_requirement_scope_id join local_organization_subprocess_scope c on c.id = s.organization_subprocess_scope_id",
        "policy_id", "c.organization_id", parentId, organizationId,
        lifecycleStatus, page, size, sort, direction);
    return new LocalRequirementPolicyDtos.Page(keys.items().stream()
        .map(key -> requirementPoliciesService.detail(key.targetId(), key.id(), organizationId))
        .toList(), page, size, keys.totalElements(), keys.totalPages());
  }

  private PageKeys keys(String selectSql, String parentColumn, String organizationColumn,
      UUID parentId, UUID organizationId, MasterDataLifecycleStatus lifecycleStatus,
      int page, int size, String sort, String direction) {
    rules.pageable(page, size, sort, direction);
    StringBuilder sql = new StringBuilder(selectSql).append(" where x.")
        .append(parentColumn).append(" = :parent");
    var parameters = new MapSqlParameterSource("parent", raw(parentId));
    if (organizationId != null) {
      sql.append(" and ").append(organizationColumn).append(" = :organization");
      parameters.addValue("organization", raw(organizationId));
    }
    if (lifecycleStatus == null) sql.append(" and x.status in ('ACTIVE', 'INACTIVE')");
    else {
      sql.append(" and x.status = :status");
      parameters.addValue("status", lifecycleStatus.name());
    }
    Long total = jdbc.queryForObject("select count(*) from (" + sql + ")", parameters, Long.class);
    String column = sort.equals("createdAt") ? "x.created_at" : "x.id";
    sql.append(" order by ").append(column).append(" ").append(direction)
        .append(", x.id asc offset :offset rows fetch next :limit rows only");
    parameters.addValue("offset", (long) page * size).addValue("limit", size);
    List<Key> items = jdbc.query(sql.toString(), parameters,
        (rs, index) -> new Key(uuid(rs.getBytes("id")), uuid(rs.getBytes("target_id"))));
    long count = total == null ? 0 : total;
    return new PageKeys(items, count, (int) ((count + size - 1) / size));
  }

  private static byte[] raw(UUID id) {
    var bytes = ByteBuffer.allocate(16);
    bytes.putLong(id.getMostSignificantBits()).putLong(id.getLeastSignificantBits());
    return bytes.array();
  }

  private static UUID uuid(byte[] raw) {
    var bytes = ByteBuffer.wrap(raw);
    return new UUID(bytes.getLong(), bytes.getLong());
  }

  private record Key(UUID id, UUID targetId) {}
  private record PageKeys(List<Key> items, long totalElements, int totalPages) {}
}
