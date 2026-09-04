package com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.application;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.entity.CentralControlObjectiveEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.repository.CentralControlObjectiveRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.CentralSubprocessRepository;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.api.dto.CentralSubprocessControlObjectiveScopeResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.api.mapper.CentralSubprocessControlObjectiveScopeMapper;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.domain.entity.CentralSubprocessControlObjectiveScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.domain.repository.CentralSubprocessControlObjectiveScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CentralSubprocessControlObjectiveScopeQueryService {
  private final CentralSubprocessControlObjectiveScopeRepository scopes;
  private final CentralSubprocessRepository subprocesses;
  private final CentralControlObjectiveRepository objectives;
  private final CentralSubprocessControlObjectiveScopeMapper mapper;

  public CentralSubprocessControlObjectiveScopeQueryService(
      CentralSubprocessControlObjectiveScopeRepository scopes,
      CentralSubprocessRepository subprocesses,
      CentralControlObjectiveRepository objectives,
      CentralSubprocessControlObjectiveScopeMapper mapper) {
    this.scopes = scopes;
    this.subprocesses = subprocesses;
    this.objectives = objectives;
    this.mapper = mapper;
  }

  @Transactional(readOnly = true)
  public List<CentralSubprocessControlObjectiveScopeResponse> listForSubprocess(
      UUID subprocessId, MasterDataLifecycleStatus status, String search) {
    validateNormalStatus(status);
    CentralSubprocessEntity subprocess = requireSubprocess(subprocessId);
    List<CentralSubprocessControlObjectiveScopeEntity> rows = status == null
        ? scopes.findBySubprocessIdAndStatusNot(subprocessId, MasterDataLifecycleStatus.DELETED)
        : scopes.findBySubprocessIdAndStatus(subprocessId, status);
    Map<UUID, CentralControlObjectiveEntity> byId = objectives.findAllById(
        rows.stream().map(CentralSubprocessControlObjectiveScopeEntity::getControlObjectiveId).toList())
        .stream().collect(Collectors.toMap(CentralControlObjectiveEntity::getId, Function.identity()));
    return rows.stream()
        .map(row -> mapper.toResponse(row, subprocess, requireObjective(byId, row.getControlObjectiveId())))
        .filter(row -> matches(row.controlObjectiveCode(), row.controlObjectiveTitle(), search))
        .sorted(Comparator.comparing(CentralSubprocessControlObjectiveScopeResponse::controlObjectiveCode)
            .thenComparing(CentralSubprocessControlObjectiveScopeResponse::id))
        .toList();
  }

  @Transactional(readOnly = true)
  public List<CentralSubprocessControlObjectiveScopeResponse> listForControlObjective(
      UUID controlObjectiveId, MasterDataLifecycleStatus status, String search) {
    validateNormalStatus(status);
    CentralControlObjectiveEntity objective = requireObjective(controlObjectiveId);
    List<CentralSubprocessControlObjectiveScopeEntity> rows = status == null
        ? scopes.findByControlObjectiveIdAndStatusNot(controlObjectiveId, MasterDataLifecycleStatus.DELETED)
        : scopes.findByControlObjectiveIdAndStatus(controlObjectiveId, status);
    Map<UUID, CentralSubprocessEntity> byId = subprocesses.findAllById(
        rows.stream().map(CentralSubprocessControlObjectiveScopeEntity::getSubprocessId).toList())
        .stream().collect(Collectors.toMap(CentralSubprocessEntity::getId, Function.identity()));
    return rows.stream()
        .map(row -> mapper.toResponse(row, requireSubprocess(byId, row.getSubprocessId()), objective))
        .filter(row -> matches(row.subprocessCode(), row.subprocessTitle(), search))
        .sorted(Comparator.comparing(CentralSubprocessControlObjectiveScopeResponse::subprocessCode)
            .thenComparing(CentralSubprocessControlObjectiveScopeResponse::id))
        .toList();
  }

  @Transactional(readOnly = true)
  public CentralSubprocessControlObjectiveScopeResponse detail(UUID subprocessId, UUID scopeId) {
    CentralSubprocessControlObjectiveScopeEntity scope = scopes.findById(scopeId)
        .orElseThrow(() -> scopeNotFound(scopeId));
    if (!scope.getSubprocessId().equals(subprocessId)
        || scope.getStatus() == MasterDataLifecycleStatus.DELETED) throw scopeNotFound(scopeId);
    return mapper.toResponse(scope, requireSubprocess(subprocessId), requireObjective(scope.getControlObjectiveId()));
  }

  private void validateNormalStatus(MasterDataLifecycleStatus status) {
    if (status == MasterDataLifecycleStatus.DELETED) {
      throw new UnprocessableEntityException(
          "INVALID_LIFECYCLE_FILTER", "error.masterdata.v2.invalidLifecycleFilter",
          "Deleted Control Objective Scopes are not available from normal list endpoints");
    }
  }

  private boolean matches(String code, String title, String search) {
    if (search == null || search.isBlank()) return true;
    String needle = search.trim().toLowerCase(Locale.ROOT);
    return code.toLowerCase(Locale.ROOT).contains(needle)
        || title.toLowerCase(Locale.ROOT).contains(needle);
  }

  private CentralSubprocessEntity requireSubprocess(UUID id) {
    return subprocesses.findById(id).orElseThrow(() -> endpointNotFound("Subprocess", id));
  }

  private CentralSubprocessEntity requireSubprocess(Map<UUID, CentralSubprocessEntity> values, UUID id) {
    CentralSubprocessEntity value = values.get(id);
    if (value == null) throw endpointNotFound("Subprocess", id);
    return value;
  }

  private CentralControlObjectiveEntity requireObjective(UUID id) {
    return objectives.findById(id).orElseThrow(() -> endpointNotFound("Control Objective", id));
  }

  private CentralControlObjectiveEntity requireObjective(Map<UUID, CentralControlObjectiveEntity> values, UUID id) {
    CentralControlObjectiveEntity value = values.get(id);
    if (value == null) throw endpointNotFound("Control Objective", id);
    return value;
  }

  private NotFoundException scopeNotFound(UUID id) {
    return new NotFoundException(
        "CENTRAL_CONTROL_OBJECTIVE_SCOPE_NOT_FOUND",
        "error.masterdata.controlObjectiveScope.notFound",
        "Central Control Objective Scope not found", id);
  }

  private NotFoundException endpointNotFound(String type, UUID id) {
    return new NotFoundException(
        "CONTROL_OBJECTIVE_SCOPE_ENDPOINT_NOT_FOUND",
        "error.masterdata.controlObjectiveScope.endpointNotFound",
        type + " endpoint not found", id);
  }
}
