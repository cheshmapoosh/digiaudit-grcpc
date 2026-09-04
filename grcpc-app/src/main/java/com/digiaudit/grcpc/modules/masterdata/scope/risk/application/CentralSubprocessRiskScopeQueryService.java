package com.digiaudit.grcpc.modules.masterdata.scope.risk.application;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.entity.CentralRiskTemplateEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.repository.CentralRiskTemplateRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.CentralSubprocessRepository;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.api.dto.CentralSubprocessRiskScopeResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.api.mapper.CentralSubprocessRiskScopeMapper;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.domain.entity.CentralSubprocessRiskScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.domain.repository.CentralSubprocessRiskScopeRepository;
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
public class CentralSubprocessRiskScopeQueryService {
  private final CentralSubprocessRiskScopeRepository scopes;
  private final CentralSubprocessRepository subprocesses;
  private final CentralRiskTemplateRepository riskTemplates;
  private final CentralSubprocessRiskScopeMapper mapper;

  public CentralSubprocessRiskScopeQueryService(
      CentralSubprocessRiskScopeRepository scopes,
      CentralSubprocessRepository subprocesses,
      CentralRiskTemplateRepository riskTemplates,
      CentralSubprocessRiskScopeMapper mapper) {
    this.scopes = scopes;
    this.subprocesses = subprocesses;
    this.riskTemplates = riskTemplates;
    this.mapper = mapper;
  }

  @Transactional(readOnly = true)
  public List<CentralSubprocessRiskScopeResponse> listForSubprocess(
      UUID subprocessId, MasterDataLifecycleStatus status, String search) {
    validateNormalStatus(status);
    CentralSubprocessEntity subprocess = requireSubprocess(subprocessId);
    List<CentralSubprocessRiskScopeEntity> rows =
        status == null
            ? scopes.findBySubprocessIdAndStatusNot(subprocessId, MasterDataLifecycleStatus.DELETED)
            : scopes.findBySubprocessIdAndStatus(subprocessId, status);
    Map<UUID, CentralRiskTemplateEntity> byId =
        riskTemplates.findAllById(
                rows.stream().map(CentralSubprocessRiskScopeEntity::getRiskTemplateId).toList())
            .stream()
            .collect(Collectors.toMap(CentralRiskTemplateEntity::getId, Function.identity()));
    return rows.stream()
        .map(row -> mapper.toResponse(row, subprocess, requireRiskTemplate(byId, row.getRiskTemplateId())))
        .filter(row -> matches(row.riskTemplateCode(), row.riskTemplateTitle(), search))
        .sorted(
            Comparator.comparing(CentralSubprocessRiskScopeResponse::riskTemplateCode)
                .thenComparing(CentralSubprocessRiskScopeResponse::id))
        .toList();
  }

  @Transactional(readOnly = true)
  public List<CentralSubprocessRiskScopeResponse> listForRiskTemplate(
      UUID riskTemplateId, MasterDataLifecycleStatus status, String search) {
    validateNormalStatus(status);
    CentralRiskTemplateEntity riskTemplate = requireRiskTemplate(riskTemplateId);
    List<CentralSubprocessRiskScopeEntity> rows =
        status == null
            ? scopes.findByRiskTemplateIdAndStatusNot(
                riskTemplateId, MasterDataLifecycleStatus.DELETED)
            : scopes.findByRiskTemplateIdAndStatus(riskTemplateId, status);
    Map<UUID, CentralSubprocessEntity> byId =
        subprocesses.findAllById(
                rows.stream().map(CentralSubprocessRiskScopeEntity::getSubprocessId).toList())
            .stream()
            .collect(Collectors.toMap(CentralSubprocessEntity::getId, Function.identity()));
    return rows.stream()
        .map(row -> mapper.toResponse(row, requireSubprocess(byId, row.getSubprocessId()), riskTemplate))
        .filter(row -> matches(row.subprocessCode(), row.subprocessTitle(), search))
        .sorted(
            Comparator.comparing(CentralSubprocessRiskScopeResponse::subprocessCode)
                .thenComparing(CentralSubprocessRiskScopeResponse::id))
        .toList();
  }

  @Transactional(readOnly = true)
  public CentralSubprocessRiskScopeResponse detail(UUID subprocessId, UUID scopeId) {
    CentralSubprocessRiskScopeEntity scope =
        scopes.findById(scopeId).orElseThrow(() -> scopeNotFound(scopeId));
    if (!scope.getSubprocessId().equals(subprocessId)
        || scope.getStatus() == MasterDataLifecycleStatus.DELETED) {
      throw scopeNotFound(scopeId);
    }
    return mapper.toResponse(
        scope, requireSubprocess(subprocessId), requireRiskTemplate(scope.getRiskTemplateId()));
  }

  private void validateNormalStatus(MasterDataLifecycleStatus status) {
    if (status == MasterDataLifecycleStatus.DELETED) {
      throw new UnprocessableEntityException(
          "INVALID_LIFECYCLE_FILTER",
          "error.masterdata.v2.invalidLifecycleFilter",
          "Deleted Risk Scopes are not available from normal list endpoints");
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

  private CentralRiskTemplateEntity requireRiskTemplate(UUID id) {
    return riskTemplates.findById(id).orElseThrow(() -> endpointNotFound("Risk Template", id));
  }

  private CentralRiskTemplateEntity requireRiskTemplate(
      Map<UUID, CentralRiskTemplateEntity> values, UUID id) {
    CentralRiskTemplateEntity value = values.get(id);
    if (value == null) throw endpointNotFound("Risk Template", id);
    return value;
  }

  private CentralSubprocessEntity requireSubprocess(
      Map<UUID, CentralSubprocessEntity> values, UUID id) {
    CentralSubprocessEntity value = values.get(id);
    if (value == null) throw endpointNotFound("Subprocess", id);
    return value;
  }

  private NotFoundException scopeNotFound(UUID id) {
    return new NotFoundException(
        "CENTRAL_RISK_SCOPE_NOT_FOUND",
        "error.masterdata.riskScope.notFound",
        "Central Risk Scope not found",
        id);
  }

  private NotFoundException endpointNotFound(String type, UUID id) {
    return new NotFoundException(
        "RISK_SCOPE_ENDPOINT_NOT_FOUND",
        "error.masterdata.riskScope.endpointNotFound",
        type + " endpoint not found",
        id);
  }
}
