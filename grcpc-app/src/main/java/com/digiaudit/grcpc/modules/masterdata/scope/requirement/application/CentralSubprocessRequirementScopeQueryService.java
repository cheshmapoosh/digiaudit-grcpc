package com.digiaudit.grcpc.modules.masterdata.scope.requirement.application;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationRequirementEntity;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.repository.CentralRegulationRequirementRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.CentralSubprocessEntity;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.CentralSubprocessRepository;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.api.dto.CentralSubprocessRequirementScopeResponse;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.api.mapper.CentralSubprocessRequirementScopeMapper;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.domain.entity.CentralSubprocessRequirementScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.domain.repository.CentralSubprocessRequirementScopeRepository;
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
public class CentralSubprocessRequirementScopeQueryService {
  private final CentralSubprocessRequirementScopeRepository scopes;
  private final CentralSubprocessRepository subprocesses;
  private final CentralRegulationRequirementRepository requirements;
  private final CentralSubprocessRequirementScopeMapper mapper;

  public CentralSubprocessRequirementScopeQueryService(
      CentralSubprocessRequirementScopeRepository scopes,
      CentralSubprocessRepository subprocesses,
      CentralRegulationRequirementRepository requirements,
      CentralSubprocessRequirementScopeMapper mapper) {
    this.scopes = scopes;
    this.subprocesses = subprocesses;
    this.requirements = requirements;
    this.mapper = mapper;
  }

  @Transactional(readOnly = true)
  public List<CentralSubprocessRequirementScopeResponse> listForSubprocess(
      UUID subprocessId, MasterDataLifecycleStatus status, String search) {
    validateNormalStatus(status);
    CentralSubprocessEntity subprocess = requireSubprocess(subprocessId);
    List<CentralSubprocessRequirementScopeEntity> rows = status == null
        ? scopes.findBySubprocessIdAndStatusNot(subprocessId, MasterDataLifecycleStatus.DELETED)
        : scopes.findBySubprocessIdAndStatus(subprocessId, status);
    Map<UUID, CentralRegulationRequirementEntity> byId = requirements.findAllById(
        rows.stream().map(CentralSubprocessRequirementScopeEntity::getRequirementId).toList())
        .stream().collect(Collectors.toMap(CentralRegulationRequirementEntity::getId, Function.identity()));
    return rows.stream()
        .map(row -> mapper.toResponse(row, subprocess, requireRequirement(byId, row.getRequirementId())))
        .filter(row -> matches(row.requirementCode(), row.requirementTitle(), search))
        .sorted(Comparator.comparing(CentralSubprocessRequirementScopeResponse::requirementCode)
            .thenComparing(CentralSubprocessRequirementScopeResponse::id))
        .toList();
  }

  @Transactional(readOnly = true)
  public List<CentralSubprocessRequirementScopeResponse> listForRequirement(
      UUID requirementId, MasterDataLifecycleStatus status, String search) {
    validateNormalStatus(status);
    CentralRegulationRequirementEntity requirement = requireRequirement(requirementId);
    List<CentralSubprocessRequirementScopeEntity> rows = status == null
        ? scopes.findByRequirementIdAndStatusNot(requirementId, MasterDataLifecycleStatus.DELETED)
        : scopes.findByRequirementIdAndStatus(requirementId, status);
    Map<UUID, CentralSubprocessEntity> byId = subprocesses.findAllById(
        rows.stream().map(CentralSubprocessRequirementScopeEntity::getSubprocessId).toList())
        .stream().collect(Collectors.toMap(CentralSubprocessEntity::getId, Function.identity()));
    return rows.stream()
        .map(row -> mapper.toResponse(row, requireSubprocess(byId, row.getSubprocessId()), requirement))
        .filter(row -> matches(row.subprocessCode(), row.subprocessTitle(), search))
        .sorted(Comparator.comparing(CentralSubprocessRequirementScopeResponse::subprocessCode)
            .thenComparing(CentralSubprocessRequirementScopeResponse::id))
        .toList();
  }

  @Transactional(readOnly = true)
  public CentralSubprocessRequirementScopeResponse detail(UUID subprocessId, UUID scopeId) {
    CentralSubprocessRequirementScopeEntity scope = scopes.findById(scopeId)
        .orElseThrow(() -> scopeNotFound(scopeId));
    if (!scope.getSubprocessId().equals(subprocessId)
        || scope.getStatus() == MasterDataLifecycleStatus.DELETED) throw scopeNotFound(scopeId);
    return mapper.toResponse(scope, requireSubprocess(subprocessId), requireRequirement(scope.getRequirementId()));
  }

  private void validateNormalStatus(MasterDataLifecycleStatus status) {
    if (status == MasterDataLifecycleStatus.DELETED) {
      throw new UnprocessableEntityException(
          "INVALID_LIFECYCLE_FILTER", "error.masterdata.v2.invalidLifecycleFilter",
          "Deleted Requirement Scopes are not available from normal list endpoints");
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

  private CentralRegulationRequirementEntity requireRequirement(UUID id) {
    return requirements.findById(id).orElseThrow(() -> endpointNotFound("Requirement", id));
  }

  private CentralRegulationRequirementEntity requireRequirement(
      Map<UUID, CentralRegulationRequirementEntity> values, UUID id) {
    CentralRegulationRequirementEntity value = values.get(id);
    if (value == null) throw endpointNotFound("Requirement", id);
    return value;
  }

  private NotFoundException scopeNotFound(UUID id) {
    return new NotFoundException(
        "CENTRAL_REQUIREMENT_SCOPE_NOT_FOUND", "error.masterdata.requirementScope.notFound",
        "Central Requirement Scope not found", id);
  }

  private NotFoundException endpointNotFound(String type, UUID id) {
    return new NotFoundException(
        "REQUIREMENT_SCOPE_ENDPOINT_NOT_FOUND", "error.masterdata.requirementScope.endpointNotFound",
        type + " endpoint not found", id);
  }
}
