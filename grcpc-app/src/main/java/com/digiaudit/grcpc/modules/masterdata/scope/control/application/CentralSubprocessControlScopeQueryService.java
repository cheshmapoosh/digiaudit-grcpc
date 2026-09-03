package com.digiaudit.grcpc.modules.masterdata.scope.control.application;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.repository.CentralControlRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.CentralSubprocessRepository;
import com.digiaudit.grcpc.modules.masterdata.scope.control.api.dto.CentralSubprocessControlScopeResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.control.api.mapper.CentralSubprocessControlScopeMapper;
import com.digiaudit.grcpc.modules.masterdata.scope.control.domain.entity.CentralSubprocessControlScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.control.domain.repository.CentralSubprocessControlScopeRepository;
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
public class CentralSubprocessControlScopeQueryService {
  private final CentralSubprocessControlScopeRepository scopes;
  private final CentralSubprocessRepository subprocesses;
  private final CentralControlRepository controls;
  private final CentralSubprocessControlScopeMapper mapper;

  public CentralSubprocessControlScopeQueryService(
      CentralSubprocessControlScopeRepository scopes,
      CentralSubprocessRepository subprocesses,
      CentralControlRepository controls,
      CentralSubprocessControlScopeMapper mapper) {
    this.scopes = scopes;
    this.subprocesses = subprocesses;
    this.controls = controls;
    this.mapper = mapper;
  }

  @Transactional(readOnly = true)
  public List<CentralSubprocessControlScopeResponse> listForSubprocess(
      UUID subprocessId, MasterDataLifecycleStatus status, String search) {
    validateNormalStatus(status);
    CentralSubprocessEntity subprocess = requireSubprocess(subprocessId);
    List<CentralSubprocessControlScopeEntity> rows =
        status == null
            ? scopes.findBySubprocessIdAndStatusNot(subprocessId, MasterDataLifecycleStatus.DELETED)
            : scopes.findBySubprocessIdAndStatus(subprocessId, status);
    Map<UUID, CentralControlEntity> byId =
        controls.findAllById(rows.stream().map(CentralSubprocessControlScopeEntity::getControlId).toList())
            .stream()
            .collect(Collectors.toMap(CentralControlEntity::getId, Function.identity()));
    return rows.stream()
        .map(row -> mapper.toResponse(row, subprocess, requireControl(byId, row.getControlId())))
        .filter(row -> matches(row.controlCode(), row.controlTitle(), search))
        .sorted(
            Comparator.comparing(CentralSubprocessControlScopeResponse::controlCode)
                .thenComparing(CentralSubprocessControlScopeResponse::id))
        .toList();
  }

  @Transactional(readOnly = true)
  public List<CentralSubprocessControlScopeResponse> listForControl(
      UUID controlId, MasterDataLifecycleStatus status, String search) {
    validateNormalStatus(status);
    CentralControlEntity control = requireControl(controlId);
    List<CentralSubprocessControlScopeEntity> rows =
        status == null
            ? scopes.findByControlIdAndStatusNot(controlId, MasterDataLifecycleStatus.DELETED)
            : scopes.findByControlIdAndStatus(controlId, status);
    Map<UUID, CentralSubprocessEntity> byId =
        subprocesses.findAllById(
                rows.stream().map(CentralSubprocessControlScopeEntity::getSubprocessId).toList())
            .stream()
            .collect(Collectors.toMap(CentralSubprocessEntity::getId, Function.identity()));
    return rows.stream()
        .map(row -> mapper.toResponse(row, requireSubprocess(byId, row.getSubprocessId()), control))
        .filter(row -> matches(row.subprocessCode(), row.subprocessTitle(), search))
        .sorted(
            Comparator.comparing(CentralSubprocessControlScopeResponse::subprocessCode)
                .thenComparing(CentralSubprocessControlScopeResponse::id))
        .toList();
  }

  @Transactional(readOnly = true)
  public CentralSubprocessControlScopeResponse detail(UUID subprocessId, UUID scopeId) {
    CentralSubprocessControlScopeEntity scope =
        scopes.findById(scopeId).orElseThrow(() -> scopeNotFound(scopeId));
    if (!scope.getSubprocessId().equals(subprocessId)) {
      throw scopeNotFound(scopeId);
    }
    if (scope.getStatus() == MasterDataLifecycleStatus.DELETED) {
      throw scopeNotFound(scopeId);
    }
    return mapper.toResponse(
        scope, requireSubprocess(subprocessId), requireControl(scope.getControlId()));
  }

  private void validateNormalStatus(MasterDataLifecycleStatus status) {
    if (status == MasterDataLifecycleStatus.DELETED) {
      throw new UnprocessableEntityException(
          "INVALID_LIFECYCLE_FILTER",
          "error.masterdata.v2.invalidLifecycleFilter",
          "Deleted Control Scopes are not available from normal list endpoints");
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

  private CentralControlEntity requireControl(UUID id) {
    return controls.findById(id).orElseThrow(() -> endpointNotFound("Control", id));
  }

  private CentralControlEntity requireControl(Map<UUID, CentralControlEntity> values, UUID id) {
    CentralControlEntity value = values.get(id);
    if (value == null) throw endpointNotFound("Control", id);
    return value;
  }

  private CentralSubprocessEntity requireSubprocess(Map<UUID, CentralSubprocessEntity> values, UUID id) {
    CentralSubprocessEntity value = values.get(id);
    if (value == null) throw endpointNotFound("Subprocess", id);
    return value;
  }

  private NotFoundException scopeNotFound(UUID id) {
    return new NotFoundException(
        "CENTRAL_CONTROL_SCOPE_NOT_FOUND",
        "error.masterdata.controlScope.notFound",
        "Central Control Scope not found",
        id);
  }

  private NotFoundException endpointNotFound(String type, UUID id) {
    return new NotFoundException(
        "CONTROL_SCOPE_ENDPOINT_NOT_FOUND",
        "error.masterdata.controlScope.endpointNotFound",
        type + " endpoint not found",
        id);
  }
}
