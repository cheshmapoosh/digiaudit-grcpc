package com.digiaudit.grcpc.modules.masterdata.local.application;

import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.CentralControlAutomationType;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.CentralControlOperationFrequency;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.enums.CentralControlTestingTechnique;
import com.digiaudit.grcpc.modules.masterdata.local.api.dto.LocalOptionDtos;
import com.digiaudit.grcpc.modules.masterdata.local.domain.repository.LocalOrganizationSubprocessScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.local.domain.repository.LocalSubprocessControlScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.local.domain.repository.LocalSubprocessRiskScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.local.domain.repository.LocalSubprocessControlObjectiveScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.local.domain.repository.LocalSubprocessRequirementScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.nio.ByteBuffer;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;
import java.util.UUID;
import java.util.function.Function;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class LocalOptionsService {
  private static final String CATALOG_COLUMNS =
      "x.id, x.code, x.title display_label, x.status, x.valid_from, x.valid_to, x.version";
  private static final String SEARCH =
      " and (:q = '' or instr(upper(x.code), upper(:q)) > 0 or instr(upper(x.title), upper(:q)) > 0)";
  private final LocalCommandRules rules;
  private final NamedParameterJdbcTemplate jdbc;
  private final LocalOrganizationSubprocessScopeRepository contexts;
  private final LocalSubprocessControlScopeRepository controlScopes;
  private final LocalSubprocessRiskScopeRepository riskScopes;
  private final LocalSubprocessControlObjectiveScopeRepository objectiveScopes;
  private final LocalSubprocessRequirementScopeRepository requirementScopes;

  public LocalOptionsService(LocalCommandRules rules, NamedParameterJdbcTemplate jdbc,
      LocalOrganizationSubprocessScopeRepository contexts,
      LocalSubprocessControlScopeRepository controlScopes,
      LocalSubprocessRiskScopeRepository riskScopes,
      LocalSubprocessControlObjectiveScopeRepository objectiveScopes,
      LocalSubprocessRequirementScopeRepository requirementScopes) {
    this.rules = rules;
    this.jdbc = jdbc;
    this.contexts = contexts;
    this.controlScopes = controlScopes;
    this.riskScopes = riskScopes;
    this.objectiveScopes = objectiveScopes;
    this.requirementScopes = requirementScopes;
  }

  public LocalOptionDtos.Page<LocalOptionDtos.Catalog> organizations(
      String q, int page, int size, String sort, String direction) {
    rules.requireView("PROCESS");
    return page("select x.id, x.code, x.name display_label, x.status, x.valid_from, x.valid_to, x.version"
        + " from organization x where x.status = 'ACTIVE'"
        + " and (:q = '' or instr(upper(x.code), upper(:q)) > 0"
        + " or instr(upper(x.name), upper(:q)) > 0)",
        parameters(q), page, size, sort, direction, this::catalog);
  }

  public LocalOptionDtos.Page<LocalOptionDtos.Catalog> subprocesses(
      String q, int page, int size, String sort, String direction) {
    rules.requireView("PROCESS");
    return catalogPage("central_subprocess", q, page, size, sort, direction);
  }

  public LocalOptionDtos.Page<LocalOptionDtos.Catalog> controls(
      String q, int page, int size, String sort, String direction) {
    rules.requireView("PROCESS", "CONTROL");
    return catalogPage("central_control", q, page, size, sort, direction);
  }

  public LocalOptionDtos.Page<LocalOptionDtos.Catalog> risks(
      String q, int page, int size, String sort, String direction) {
    rules.requireView("PROCESS", "RISK");
    return catalogPage("central_risk_template", q, page, size, sort, direction);
  }

  public LocalOptionDtos.Page<LocalOptionDtos.Catalog> objectives(
      String q, int page, int size, String sort, String direction) {
    rules.requireView("PROCESS", "CONTROL");
    return catalogPage("central_control_objective", q, page, size, sort, direction);
  }

  public LocalOptionDtos.Page<LocalOptionDtos.Catalog> policies(
      String q, int page, int size, String sort, String direction) {
    rules.requireView("GOVERNANCE");
    return catalogPage("central_policy", q, page, size, sort, direction);
  }

  public LocalOptionDtos.Page<LocalOptionDtos.Requirement> requirements(
      String q, int page, int size, String sort, String direction) {
    rules.requireView("PROCESS", "GOVERNANCE");
    String sql = "select x.id, x.code, x.title display_label, x.status, x.valid_from,"
        + " x.valid_to, x.version, r.id regulation_id, r.code regulation_code,"
        + " r.title regulation_label, g.id regulation_group_id,"
        + " g.code regulation_group_code, g.title regulation_group_label"
        + " from central_regulation_requirement x"
        + " join central_regulation r on r.id = x.regulation_id"
        + " join central_regulation_group g on g.id = r.regulation_group_id"
        + " where x.status = 'ACTIVE'" + SEARCH;
    return page(sql, parameters(q), page, size, sort, direction,
        (rs, row) -> new LocalOptionDtos.Requirement(
            uuid(rs, "id"), rs.getString("code"), rs.getString("display_label"),
            status(rs), date(rs, "valid_from"), date(rs, "valid_to"), rs.getLong("version"),
            uuid(rs, "regulation_id"), rs.getString("regulation_code"),
            rs.getString("regulation_label"), uuid(rs, "regulation_group_id"),
            rs.getString("regulation_group_code"), rs.getString("regulation_group_label")));
  }

  public LocalOptionDtos.Page<LocalOptionDtos.Owner> owners(
      String q, int page, int size, String sort, String direction) {
    rules.requireWrite("PROCESS", "CONTROL");
    String sql = "select x.id, trim(x.first_name || ' ' || x.last_name) display_label"
        + " from app_user x where x.enabled = 1 and x.locked = 0"
        + " and (:q = '' or instr(upper(x.first_name), upper(:q)) > 0"
        + " or instr(upper(x.last_name), upper(:q)) > 0)";
    return page(sql, parameters(q), page, size, sort, direction,
        (rs, row) -> new LocalOptionDtos.Owner(
            UUID.fromString(rs.getString("id")), rs.getString("display_label")));
  }

  public LocalOptionDtos.ControlSettings settings() {
    rules.requireView("PROCESS", "CONTROL");
    return new LocalOptionDtos.ControlSettings(
        names(CentralControlOperationFrequency.values()),
        names(CentralControlAutomationType.values()),
        names(CentralControlTestingTechnique.values()));
  }

  public LocalOptionDtos.Page<LocalOptionDtos.ControlScope> controlScopes(UUID contextId,
      UUID organizationId, UUID controlId, String q,
      int page, int size, String sort, String direction) {
    rules.requireView("PROCESS", "CONTROL");
    return mapPage(scopePage("central_subprocess_control_scope", "central_control", "control_id",
        subprocess(contextId, organizationId), controlId, q, page, size, sort, direction),
        s -> new LocalOptionDtos.ControlScope(s.id(), s.subprocessId(), s.definitionId(),
            s.definitionCode(), s.definitionLabel(), s.status(), s.validFrom(), s.validTo(), s.version()));
  }

  public LocalOptionDtos.Page<LocalOptionDtos.RiskScope> riskScopes(UUID contextId,
      UUID organizationId, UUID riskTemplateId, String q,
      int page, int size, String sort, String direction) {
    rules.requireView("PROCESS", "RISK");
    return mapPage(scopePage("central_subprocess_risk_scope", "central_risk_template",
        "risk_template_id", subprocess(contextId, organizationId), riskTemplateId,
        q, page, size, sort, direction),
        s -> new LocalOptionDtos.RiskScope(s.id(), s.subprocessId(), s.definitionId(),
            s.definitionCode(), s.definitionLabel(), s.status(), s.validFrom(), s.validTo(), s.version()));
  }

  public LocalOptionDtos.Page<LocalOptionDtos.ObjectiveScope> objectiveScopes(UUID contextId,
      UUID organizationId, UUID controlObjectiveId, String q,
      int page, int size, String sort, String direction) {
    rules.requireView("PROCESS", "CONTROL");
    return mapPage(scopePage("central_subprocess_control_objective_scope",
        "central_control_objective", "control_objective_id",
        subprocess(contextId, organizationId), controlObjectiveId,
        q, page, size, sort, direction),
        s -> new LocalOptionDtos.ObjectiveScope(s.id(), s.subprocessId(), s.definitionId(),
            s.definitionCode(), s.definitionLabel(), s.status(), s.validFrom(), s.validTo(), s.version()));
  }

  public LocalOptionDtos.Page<LocalOptionDtos.RequirementScope> requirementScopes(UUID contextId,
      UUID organizationId, UUID requirementId, String q,
      int page, int size, String sort, String direction) {
    rules.requireView("PROCESS", "GOVERNANCE");
    return mapPage(scopePage("central_subprocess_requirement_scope",
        "central_regulation_requirement", "requirement_id",
        subprocess(contextId, organizationId), requirementId,
        q, page, size, sort, direction),
        s -> new LocalOptionDtos.RequirementScope(s.id(), s.subprocessId(), s.definitionId(),
            s.definitionCode(), s.definitionLabel(), s.status(), s.validFrom(), s.validTo(), s.version()));
  }

  public LocalOptionDtos.Page<LocalOptionDtos.ControlScope> centralControlScopes(
      UUID subprocessId, UUID controlId, String q,
      int page, int size, String sort, String direction) {
    rules.requireView("PROCESS", "CONTROL");
    return mapPage(scopePage("central_subprocess_control_scope", "central_control",
        "control_id", subprocessId, controlId, q, page, size, sort, direction),
        s -> new LocalOptionDtos.ControlScope(s.id(), s.subprocessId(), s.definitionId(),
            s.definitionCode(), s.definitionLabel(), s.status(), s.validFrom(), s.validTo(), s.version()));
  }

  private LocalOptionDtos.Page<LocalOptionDtos.Scope> scopePage(
      String table, String definitionTable, String definitionColumn,
      UUID subprocessId, UUID definitionId, String q,
      int page, int size, String sort, String direction) {
    if (subprocessId == null || definitionId == null) {
      throw rules.bad("Subprocess and definition are required");
    }
    String sql = "select x.id, x.subprocess_id, x." + definitionColumn
        + " definition_id, d.code definition_code, d.title definition_label,"
        + " x.status, x.valid_from, x.valid_to, x.version"
        + " from " + table + " x join " + definitionTable
        + " d on d.id = x." + definitionColumn
        + " where x.subprocess_id = :sp and x." + definitionColumn
        + " = :definition and x.status = 'ACTIVE' and d.status = 'ACTIVE'"
        + " and (:q = '' or instr(upper(d.code), upper(:q)) > 0"
        + " or instr(upper(d.title), upper(:q)) > 0)";
    return page(sql, parameters(q).addValue("sp", raw(subprocessId))
            .addValue("definition", raw(definitionId)),
        page, size, sort, direction,
        (rs, row) -> new LocalOptionDtos.Scope(uuid(rs, "id"),
            uuid(rs, "subprocess_id"), uuid(rs, "definition_id"),
            rs.getString("definition_code"), rs.getString("definition_label"),
            status(rs), date(rs, "valid_from"), date(rs, "valid_to"),
            rs.getLong("version")));
  }

  private UUID subprocess(UUID contextId, UUID organizationId) {
    var context = contexts.findById(contextId).orElseThrow(() -> rules.notFound(contextId));
    rules.assertOwner(organizationId, context.getOrganizationId());
    return context.getSubprocessId();
  }

  public LocalOptionDtos.Page<LocalOptionDtos.RiskControlCoverage> riskControlCoverages(
      UUID contextId, UUID organizationId, UUID localRiskScopeId, UUID localControlScopeId,
      String q, int page, int size, String sort, String direction) {
    rules.requireView("PROCESS", "RISK", "CONTROL");
    UUID sp = subprocess(contextId, organizationId);
    var risk = riskScopes.findById(localRiskScopeId)
        .orElseThrow(() -> rules.referenceNotFound(localRiskScopeId));
    var control = controlScopes.findById(localControlScopeId)
        .orElseThrow(() -> rules.referenceNotFound(localControlScopeId));
    endpoint(contextId, risk.getOrganizationSubprocessScopeId(), risk.getStatus());
    endpoint(contextId, control.getOrganizationSubprocessScopeId(), control.getStatus());
    return mapPage(coveragePage("central_subprocess_risk_control_coverage",
        "risk_scope_id", "control_scope_id",
        "central_subprocess_risk_scope", "central_subprocess_control_scope",
        "risk_template_id", "control_id",
        "central_risk_template", "central_control",
        sp, risk.getRiskTemplateId(), control.getControlId(), q, page, size, sort, direction),
        c -> new LocalOptionDtos.RiskControlCoverage(c.id(), c.subprocessId(),
            c.leftScopeId(), c.rightScopeId(), c.leftDefinitionId(), c.rightDefinitionId(),
            c.leftDefinitionCode(), c.leftDefinitionLabel(), c.rightDefinitionCode(),
            c.rightDefinitionLabel(), c.status(), c.validFrom(), c.validTo(), c.version()));
  }

  public LocalOptionDtos.Page<LocalOptionDtos.RiskObjectiveCoverage> riskObjectiveCoverages(
      UUID contextId, UUID organizationId, UUID localRiskScopeId,
      UUID localControlObjectiveScopeId, String q,
      int page, int size, String sort, String direction) {
    rules.requireView("PROCESS", "RISK", "CONTROL");
    UUID sp = subprocess(contextId, organizationId);
    var risk = riskScopes.findById(localRiskScopeId)
        .orElseThrow(() -> rules.referenceNotFound(localRiskScopeId));
    var objective = objectiveScopes.findById(localControlObjectiveScopeId)
        .orElseThrow(() -> rules.referenceNotFound(localControlObjectiveScopeId));
    endpoint(contextId, risk.getOrganizationSubprocessScopeId(), risk.getStatus());
    endpoint(contextId, objective.getOrganizationSubprocessScopeId(), objective.getStatus());
    return mapPage(coveragePage("central_subprocess_risk_control_objective_coverage",
        "risk_scope_id", "control_objective_scope_id",
        "central_subprocess_risk_scope", "central_subprocess_control_objective_scope",
        "risk_template_id", "control_objective_id",
        "central_risk_template", "central_control_objective",
        sp, risk.getRiskTemplateId(), objective.getControlObjectiveId(),
        q, page, size, sort, direction),
        c -> new LocalOptionDtos.RiskObjectiveCoverage(c.id(), c.subprocessId(),
            c.leftScopeId(), c.rightScopeId(), c.leftDefinitionId(), c.rightDefinitionId(),
            c.leftDefinitionCode(), c.leftDefinitionLabel(), c.rightDefinitionCode(),
            c.rightDefinitionLabel(), c.status(), c.validFrom(), c.validTo(), c.version()));
  }

  public LocalOptionDtos.Page<LocalOptionDtos.ControlObjectiveCoverage> controlObjectiveCoverages(
      UUID contextId, UUID organizationId, UUID localControlScopeId,
      UUID localControlObjectiveScopeId, String q,
      int page, int size, String sort, String direction) {
    rules.requireView("PROCESS", "CONTROL");
    UUID sp = subprocess(contextId, organizationId);
    var control = controlScopes.findById(localControlScopeId)
        .orElseThrow(() -> rules.referenceNotFound(localControlScopeId));
    var objective = objectiveScopes.findById(localControlObjectiveScopeId)
        .orElseThrow(() -> rules.referenceNotFound(localControlObjectiveScopeId));
    endpoint(contextId, control.getOrganizationSubprocessScopeId(), control.getStatus());
    endpoint(contextId, objective.getOrganizationSubprocessScopeId(), objective.getStatus());
    return mapPage(coveragePage("central_subprocess_control_control_objective_coverage",
        "control_scope_id", "control_objective_scope_id",
        "central_subprocess_control_scope", "central_subprocess_control_objective_scope",
        "control_id", "control_objective_id",
        "central_control", "central_control_objective",
        sp, control.getControlId(), objective.getControlObjectiveId(),
        q, page, size, sort, direction),
        c -> new LocalOptionDtos.ControlObjectiveCoverage(c.id(), c.subprocessId(),
            c.leftScopeId(), c.rightScopeId(), c.leftDefinitionId(), c.rightDefinitionId(),
            c.leftDefinitionCode(), c.leftDefinitionLabel(), c.rightDefinitionCode(),
            c.rightDefinitionLabel(), c.status(), c.validFrom(), c.validTo(), c.version()));
  }

  public LocalOptionDtos.Page<LocalOptionDtos.RequirementControlCoverage> requirementControlCoverages(
      UUID contextId, UUID organizationId, UUID localRequirementScopeId,
      UUID localControlScopeId, String q,
      int page, int size, String sort, String direction) {
    rules.requireView("PROCESS", "GOVERNANCE", "CONTROL");
    UUID sp = subprocess(contextId, organizationId);
    var requirement = requirementScopes.findById(localRequirementScopeId)
        .orElseThrow(() -> rules.referenceNotFound(localRequirementScopeId));
    var control = controlScopes.findById(localControlScopeId)
        .orElseThrow(() -> rules.referenceNotFound(localControlScopeId));
    endpoint(contextId, requirement.getOrganizationSubprocessScopeId(), requirement.getStatus());
    endpoint(contextId, control.getOrganizationSubprocessScopeId(), control.getStatus());
    return mapPage(coveragePage("central_subprocess_requirement_control_coverage",
        "requirement_scope_id", "control_scope_id",
        "central_subprocess_requirement_scope", "central_subprocess_control_scope",
        "requirement_id", "control_id",
        "central_regulation_requirement", "central_control",
        sp, requirement.getRequirementId(), control.getControlId(),
        q, page, size, sort, direction),
        c -> new LocalOptionDtos.RequirementControlCoverage(c.id(), c.subprocessId(),
            c.leftScopeId(), c.rightScopeId(), c.leftDefinitionId(), c.rightDefinitionId(),
            c.leftDefinitionCode(), c.leftDefinitionLabel(), c.rightDefinitionCode(),
            c.rightDefinitionLabel(), c.status(), c.validFrom(), c.validTo(), c.version()));
  }

  private void endpoint(UUID contextId, UUID endpointContextId,
      MasterDataLifecycleStatus status) {
    if (!contextId.equals(endpointContextId)) {
      throw rules.invalid("CROSS_LOCAL_CONTEXT_COVERAGE", "Local endpoint belongs to another Context");
    }
    rules.active(status);
  }

  private LocalOptionDtos.Page<LocalOptionDtos.Coverage> coveragePage(
      String table, String leftColumn, String rightColumn,
      String leftScopeTable, String rightScopeTable,
      String leftDefinitionColumn, String rightDefinitionColumn,
      String leftDefinitionTable, String rightDefinitionTable,
      UUID subprocessId, UUID leftDefinitionId, UUID rightDefinitionId,
      String q, int page, int size, String sort, String direction) {
    String sql = "select x.id, x.subprocess_id,"
        + " x." + leftColumn + " left_scope_id, x." + rightColumn + " right_scope_id,"
        + " l." + leftDefinitionColumn + " left_definition_id,"
        + " r." + rightDefinitionColumn + " right_definition_id,"
        + " ld.code left_definition_code, ld.title left_definition_label,"
        + " rd.code right_definition_code, rd.title right_definition_label,"
        + " x.status, x.valid_from, x.valid_to, x.version"
        + " from " + table + " x"
        + " join " + leftScopeTable + " l on l.id = x." + leftColumn
        + " join " + rightScopeTable + " r on r.id = x." + rightColumn
        + " join " + leftDefinitionTable + " ld on ld.id = l." + leftDefinitionColumn
        + " join " + rightDefinitionTable + " rd on rd.id = r." + rightDefinitionColumn
        + " where x.subprocess_id = :sp"
        + " and l." + leftDefinitionColumn + " = :leftDefinition"
        + " and r." + rightDefinitionColumn + " = :rightDefinition"
        + " and x.status = 'ACTIVE' and l.status = 'ACTIVE' and r.status = 'ACTIVE'"
        + " and ld.status = 'ACTIVE' and rd.status = 'ACTIVE'"
        + " and (:q = '' or instr(upper(ld.code), upper(:q)) > 0"
        + " or instr(upper(ld.title), upper(:q)) > 0"
        + " or instr(upper(rd.code), upper(:q)) > 0"
        + " or instr(upper(rd.title), upper(:q)) > 0)";
    return page(sql, parameters(q).addValue("sp", raw(subprocessId))
            .addValue("leftDefinition", raw(leftDefinitionId))
            .addValue("rightDefinition", raw(rightDefinitionId)),
        page, size, sort, direction,
        (rs, row) -> new LocalOptionDtos.Coverage(
            uuid(rs, "id"), uuid(rs, "subprocess_id"),
            uuid(rs, "left_scope_id"), uuid(rs, "right_scope_id"),
            uuid(rs, "left_definition_id"), uuid(rs, "right_definition_id"),
            rs.getString("left_definition_code"), rs.getString("left_definition_label"),
            rs.getString("right_definition_code"), rs.getString("right_definition_label"),
            status(rs), date(rs, "valid_from"), date(rs, "valid_to"),
            rs.getLong("version")));
  }

  private static byte[] raw(UUID id) {
    ByteBuffer bytes = ByteBuffer.allocate(16);
    bytes.putLong(id.getMostSignificantBits()).putLong(id.getLeastSignificantBits());
    return bytes.array();
  }

  private static <S, T> LocalOptionDtos.Page<T> mapPage(
      LocalOptionDtos.Page<S> source, Function<S, T> mapper) {
    return new LocalOptionDtos.Page<>(source.items().stream().map(mapper).toList(),
        source.page(), source.size(), source.totalElements(), source.totalPages());
  }

  private LocalOptionDtos.Page<LocalOptionDtos.Catalog> catalogPage(
      String table, String q, int page, int size, String sort, String direction) {
    // Only fixed private call sites supply table names; no request value enters SQL structure.
    return page("select " + CATALOG_COLUMNS + " from " + table
            + " x where x.status = 'ACTIVE'" + SEARCH,
        parameters(q), page, size, sort, direction, this::catalog);
  }

  private LocalOptionDtos.Catalog catalog(ResultSet rs, int row) throws SQLException {
    return new LocalOptionDtos.Catalog(uuid(rs, "id"), rs.getString("code"),
        rs.getString("display_label"), status(rs), date(rs, "valid_from"),
        date(rs, "valid_to"), rs.getLong("version"));
  }

  private <T> LocalOptionDtos.Page<T> page(String sql, MapSqlParameterSource parameters,
      int page, int size, String sort, String direction, RowMapper<T> mapper) {
    rules.pageable(page, size, sort, direction);
    String orderColumn = sort.equals("createdAt") ? "x.created_at" : "x.id";
    String ordering = " order by " + orderColumn + " " + direction + ", x.id asc";
    Long total = jdbc.queryForObject("select count(*) from (" + sql + ")",
        parameters, Long.class);
    parameters.addValue("offset", (long) page * size).addValue("limit", size);
    List<T> items = jdbc.query(sql + ordering + " offset :offset rows fetch next :limit rows only",
        parameters, mapper);
    long count = total == null ? 0 : total;
    return new LocalOptionDtos.Page<>(items, page, size, count,
        (int) ((count + size - 1) / size));
  }

  private MapSqlParameterSource parameters(String q) {
    String normalized = q == null ? "" : q.trim();
    if (normalized.length() > 100) throw rules.bad("Search exceeds 100 characters");
    return new MapSqlParameterSource("q", normalized);
  }

  private static <E extends Enum<E>> List<String> names(E[] values) {
    return Arrays.stream(values).map(Enum::name).toList();
  }

  private static UUID uuid(ResultSet rs, String name) throws SQLException {
    byte[] raw = rs.getBytes(name);
    if (raw == null) return null;
    ByteBuffer bytes = ByteBuffer.wrap(raw);
    return new UUID(bytes.getLong(), bytes.getLong());
  }

  private static LocalDate date(ResultSet rs, String name) throws SQLException {
    var value = rs.getDate(name);
    return value == null ? null : value.toLocalDate();
  }

  private static MasterDataLifecycleStatus status(ResultSet rs) throws SQLException {
    return MasterDataLifecycleStatus.valueOf(rs.getString("status"));
  }
}
