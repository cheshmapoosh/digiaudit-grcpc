package com.digiaudit.grcpc.modules.masterdata.coverage.application;

import com.digiaudit.grcpc.common.exception.UnprocessableEntityException;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.repository.CentralControlRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.repository.CentralControlObjectiveRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.repository.CentralRegulationRequirementRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.repository.CentralRiskTemplateRepository;
import com.digiaudit.grcpc.modules.masterdata.coverage.controlcontrolobjective.api.dto.CentralControlControlObjectiveCoverageChangeRequest;
import com.digiaudit.grcpc.modules.masterdata.coverage.requirementcontrol.api.dto.CentralRequirementControlCoverageChangeRequest;
import com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrol.api.dto.CentralRiskControlCoverageChangeRequest;
import com.digiaudit.grcpc.modules.masterdata.coverage.riskcontrolobjective.api.dto.CentralRiskControlObjectiveCoverageChangeRequest;
import com.digiaudit.grcpc.modules.masterdata.scope.control.api.dto.CentralControlScopeChangeRequest;
import com.digiaudit.grcpc.modules.masterdata.scope.control.domain.repository.CentralSubprocessControlScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.api.dto.CentralControlObjectiveScopeChangeRequest;
import com.digiaudit.grcpc.modules.masterdata.scope.controlobjective.domain.repository.CentralSubprocessControlObjectiveScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.api.dto.CentralRequirementScopeChangeRequest;
import com.digiaudit.grcpc.modules.masterdata.scope.requirement.domain.repository.CentralSubprocessRequirementScopeRepository;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.api.dto.CentralRiskScopeChangeRequest;
import com.digiaudit.grcpc.modules.masterdata.scope.risk.domain.repository.CentralSubprocessRiskScopeRepository;
import java.util.List;
import java.util.Objects;
import java.util.TreeSet;
import java.util.UUID;
import org.springframework.stereotype.Service;

/** Acquires the complete typed endpoint union in the PROCESS aggregate lock order. */
@Service
public class CentralSubprocessCoverageLockCoordinator {
  private final CentralControlRepository controls;
  private final CentralSubprocessControlScopeRepository controlScopes;
  private final CentralRiskTemplateRepository risks;
  private final CentralSubprocessRiskScopeRepository riskScopes;
  private final CentralControlObjectiveRepository controlObjectives;
  private final CentralSubprocessControlObjectiveScopeRepository controlObjectiveScopes;
  private final CentralRegulationRequirementRepository requirements;
  private final CentralSubprocessRequirementScopeRepository requirementScopes;

  public CentralSubprocessCoverageLockCoordinator(
      CentralControlRepository controls,
      CentralSubprocessControlScopeRepository controlScopes,
      CentralRiskTemplateRepository risks,
      CentralSubprocessRiskScopeRepository riskScopes,
      CentralControlObjectiveRepository controlObjectives,
      CentralSubprocessControlObjectiveScopeRepository controlObjectiveScopes,
      CentralRegulationRequirementRepository requirements,
      CentralSubprocessRequirementScopeRepository requirementScopes) {
    this.controls = controls;
    this.controlScopes = controlScopes;
    this.risks = risks;
    this.riskScopes = riskScopes;
    this.controlObjectives = controlObjectives;
    this.controlObjectiveScopes = controlObjectiveScopes;
    this.requirements = requirements;
    this.requirementScopes = requirementScopes;
  }

  public void lockEndpointUnion(
      UUID subprocessId,
      List<CentralControlScopeChangeRequest> controlScopeChanges,
      List<CentralRiskScopeChangeRequest> riskScopeChanges,
      List<CentralControlObjectiveScopeChangeRequest> controlObjectiveScopeChanges,
      List<CentralRequirementScopeChangeRequest> requirementScopeChanges,
      List<CentralRiskControlCoverageChangeRequest> riskControlChanges,
      List<CentralRiskControlObjectiveCoverageChangeRequest> riskControlObjectiveChanges,
      List<CentralControlControlObjectiveCoverageChangeRequest> controlControlObjectiveChanges,
      List<CentralRequirementControlCoverageChangeRequest> requirementControlChanges) {
    TreeSet<UUID> controlIds = new TreeSet<>();
    TreeSet<UUID> riskIds = new TreeSet<>();
    TreeSet<UUID> controlObjectiveIds = new TreeSet<>();
    TreeSet<UUID> requirementIds = new TreeSet<>();

    safe(controlScopeChanges).forEach(change -> controlIds.add(change.controlId()));
    safe(riskScopeChanges).forEach(change -> riskIds.add(change.riskTemplateId()));
    safe(controlObjectiveScopeChanges).forEach(change -> controlObjectiveIds.add(change.controlObjectiveId()));
    safe(requirementScopeChanges).forEach(change -> requirementIds.add(change.requirementId()));

    safe(riskControlChanges).forEach(change -> {
      addRiskEndpoint(subprocessId, change.riskScopeId(), riskIds);
      addControlEndpoint(subprocessId, change.controlScopeId(), controlIds);
    });
    safe(riskControlObjectiveChanges).forEach(change -> {
      addRiskEndpoint(subprocessId, change.riskScopeId(), riskIds);
      addControlObjectiveEndpoint(
          subprocessId, change.controlObjectiveScopeId(), controlObjectiveIds);
    });
    safe(controlControlObjectiveChanges).forEach(change -> {
      addControlEndpoint(subprocessId, change.controlScopeId(), controlIds);
      addControlObjectiveEndpoint(
          subprocessId, change.controlObjectiveScopeId(), controlObjectiveIds);
    });
    safe(requirementControlChanges).forEach(change -> {
      addRequirementEndpoint(subprocessId, change.requirementScopeId(), requirementIds);
      addControlEndpoint(subprocessId, change.controlScopeId(), controlIds);
    });

    lockControls(subprocessId, controlIds);
    lockRisks(subprocessId, riskIds);
    lockControlObjectives(subprocessId, controlObjectiveIds);
    lockRequirements(subprocessId, requirementIds);
  }

  private void lockControls(UUID subprocessId, TreeSet<UUID> ids) {
    if (ids.isEmpty()) return;
    List<UUID> ordered = List.copyOf(ids);
    controls.lockAllByIds(ordered);
    controlScopes.lockByBusinessKeys(subprocessId, ordered);
  }

  private void lockRisks(UUID subprocessId, TreeSet<UUID> ids) {
    if (ids.isEmpty()) return;
    List<UUID> ordered = List.copyOf(ids);
    risks.lockAllByIds(ordered);
    riskScopes.lockByBusinessKeys(subprocessId, ordered);
  }

  private void lockControlObjectives(UUID subprocessId, TreeSet<UUID> ids) {
    if (ids.isEmpty()) return;
    List<UUID> ordered = List.copyOf(ids);
    controlObjectives.lockAllByIds(ordered);
    controlObjectiveScopes.lockByBusinessKeys(subprocessId, ordered);
  }

  private void lockRequirements(UUID subprocessId, TreeSet<UUID> ids) {
    if (ids.isEmpty()) return;
    List<UUID> ordered = List.copyOf(ids);
    requirements.lockAllByIds(ordered);
    requirementScopes.lockByBusinessKeys(subprocessId, ordered);
  }

  private void addControlEndpoint(UUID subprocessId, UUID scopeId, TreeSet<UUID> ids) {
    controlScopes.findEndpointIdsById(scopeId).ifPresent(endpoint -> {
      requireSameSubprocess(subprocessId, endpoint.getSubprocessId());
      ids.add(endpoint.getControlId());
    });
  }

  private void addRiskEndpoint(UUID subprocessId, UUID scopeId, TreeSet<UUID> ids) {
    riskScopes.findEndpointIdsById(scopeId).ifPresent(endpoint -> {
      requireSameSubprocess(subprocessId, endpoint.getSubprocessId());
      ids.add(endpoint.getRiskTemplateId());
    });
  }

  private void addControlObjectiveEndpoint(
      UUID subprocessId, UUID scopeId, TreeSet<UUID> ids) {
    controlObjectiveScopes.findEndpointIdsById(scopeId).ifPresent(endpoint -> {
      requireSameSubprocess(subprocessId, endpoint.getSubprocessId());
      ids.add(endpoint.getControlObjectiveId());
    });
  }

  private void addRequirementEndpoint(UUID subprocessId, UUID scopeId, TreeSet<UUID> ids) {
    requirementScopes.findEndpointIdsById(scopeId).ifPresent(endpoint -> {
      requireSameSubprocess(subprocessId, endpoint.getSubprocessId());
      ids.add(endpoint.getRequirementId());
    });
  }

  private void requireSameSubprocess(UUID expected, UUID actual) {
    if (!Objects.equals(expected, actual)) {
      throw new UnprocessableEntityException(
          "CROSS_SUBPROCESS_COVERAGE",
          "error.masterdata.coverage.crossSubprocess",
          "Coverage endpoints must belong to the selected Subprocess");
    }
  }

  private static <T> List<T> safe(List<T> values) {
    return values == null ? List.of() : values;
  }
}
