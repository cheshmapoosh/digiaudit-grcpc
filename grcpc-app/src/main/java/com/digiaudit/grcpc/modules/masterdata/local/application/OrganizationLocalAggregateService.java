package com.digiaudit.grcpc.modules.masterdata.local.application;
import com.digiaudit.grcpc.modules.masterdata.local.api.dto.*;
import com.digiaudit.grcpc.modules.masterdata.local.domain.entity.*;
import com.digiaudit.grcpc.modules.masterdata.local.domain.repository.*;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.*;
import com.digiaudit.grcpc.modules.masterdata.revision.application.*;
import com.digiaudit.grcpc.modules.masterdata.revision.domain.*;
import com.digiaudit.grcpc.modules.masterdata.objective.application.OrganizationObjectiveService;
import com.digiaudit.grcpc.modules.organization.domain.repository.OrganizationRepository;
import com.digiaudit.grcpc.modules.masterdata.process.domain.repository.CentralSubprocessRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.repository.CentralControlRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.repository.CentralRiskTemplateRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.repository.CentralControlObjectiveRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.repository.CentralRegulationRequirementRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.repository.CentralPolicyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Stream;
/** Organization-owned, closed typed prepare/apply pipeline. Every source shares the protected outer transaction. */
@Service @RequiredArgsConstructor
public class OrganizationLocalAggregateService {
 private final LocalCommandRules rules;
 private final MasterDataRevisionCoordinator revisions;
 private final LocalContextService contexts;
 private final LocalControlService controls;
 private final LocalRiskService risks;
 private final LocalObjectiveService objectives;
 private final LocalRequirementService requirements;
 private final LocalOrganizationPolicyService organizationPolicies;
 private final LocalContextPolicyService contextPolicies;
 private final LocalControlPolicyService controlPolicies;
 private final LocalRequirementPolicyService requirementPolicies;
 private final OrganizationObjectiveService businessObjectives;
 private final OrganizationRepository organizations;
 private final CentralSubprocessRepository subprocessRows;
 private final LocalOrganizationSubprocessScopeRepository contextRows;
 private final LocalSubprocessControlScopeRepository controlRows;
 private final LocalSubprocessRequirementScopeRepository requirementRows;
 private final CentralControlRepository controlEndpoints;
 private final CentralRiskTemplateRepository riskEndpoints;
 private final CentralControlObjectiveRepository objectiveEndpoints;
 private final CentralRegulationRequirementRepository requirementEndpoints;
 private final CentralPolicyRepository policyEndpoints;
 private static <T> List<T> items(List<T> rows) {
  if (rows == null) return List.of();
  if (rows.stream().anyMatch(Objects::isNull)) throw new LocalCommandBadRequestException("Null relationship changes are not permitted");
  return rows;
 }
 public List<MasterDataHierarchyKey> guards(OrganizationLocalDrafts request) {
  var keys = EnumSet.of(MasterDataHierarchyKey.ORGANIZATION);
  if (!items(request.subprocesses()).isEmpty()) keys.add(MasterDataHierarchyKey.PROCESS);
  if (!items(request.localControlScopeChanges()).isEmpty()) { keys.add(MasterDataHierarchyKey.PROCESS); keys.add(MasterDataHierarchyKey.CONTROL); }
  if (!items(request.localRiskScopeChanges()).isEmpty()) { keys.add(MasterDataHierarchyKey.PROCESS); keys.add(MasterDataHierarchyKey.RISK); }
  if (!items(request.localControlObjectiveScopeChanges()).isEmpty()) { keys.add(MasterDataHierarchyKey.PROCESS);  }
  if (!items(request.localRequirementScopeChanges()).isEmpty()) { keys.add(MasterDataHierarchyKey.PROCESS); keys.add(MasterDataHierarchyKey.REGULATION); }
  if (!items(request.localOrganizationPolicyChanges()).isEmpty()) { keys.add(MasterDataHierarchyKey.POLICY);   }
  if (!items(request.localContextPolicyChanges()).isEmpty()) { keys.add(MasterDataHierarchyKey.POLICY); keys.add(MasterDataHierarchyKey.PROCESS);  }
  if (!items(request.localControlPolicyChanges()).isEmpty()) { keys.add(MasterDataHierarchyKey.POLICY); keys.add(MasterDataHierarchyKey.PROCESS); keys.add(MasterDataHierarchyKey.CONTROL); }
  if (!items(request.localRequirementPolicyChanges()).isEmpty()) { keys.add(MasterDataHierarchyKey.POLICY); keys.add(MasterDataHierarchyKey.PROCESS); keys.add(MasterDataHierarchyKey.REGULATION); }
  if (!items(request.organizationObjectiveChanges()).isEmpty()) keys.add(MasterDataHierarchyKey.OBJECTIVE);
  return keys.stream().sorted(Comparator.comparing(Enum::name)).toList();
 }
 @Transactional(propagation = Propagation.MANDATORY)
 public void lock(OrganizationLocalDrafts request) { rules.lock(guards(request).toArray(MasterDataHierarchyKey[]::new)); }
 @Transactional(propagation = Propagation.MANDATORY)
 public List<OrganizationLocalDtos.ContextRef> lockEndpoints(UUID orgId, OrganizationLocalDrafts request) {
  organizations.lockById(orgId).orElseThrow(() -> rules.referenceNotFound(orgId));
  var subprocessIds = new TreeSet<UUID>(Comparator.comparing(UUID::toString));
  items(request.subprocesses()).forEach(change -> subprocessIds.add(change.subprocessId()));
  var references = new ArrayList<OrganizationLocalDtos.ContextRef>();
  items(request.localControlScopeChanges()).forEach(change -> references.add(change.contextRef()));
  items(request.localRiskScopeChanges()).forEach(change -> references.add(change.contextRef()));
  items(request.localControlObjectiveScopeChanges()).forEach(change -> references.add(change.contextRef()));
  items(request.localRequirementScopeChanges()).forEach(change -> references.add(change.contextRef()));
  items(request.localContextPolicyChanges()).forEach(change -> references.add(change.contextRef()));
  var controlIds = new TreeSet<UUID>(Comparator.comparing(UUID::toString));
  var requirementIds = new TreeSet<UUID>(Comparator.comparing(UUID::toString));
  for (var change : items(request.localControlPolicyChanges())) {
   var ref = change.controlScopeRef();
   if (ref == null || (ref.localControlScopeId() == null) == (ref.contextRef() == null && ref.controlId() == null)) throw rules.bad("Invalid exact Control Scope reference");
   if (ref.localControlScopeId() != null) {
    var row = controlRows.findById(ref.localControlScopeId()).orElseThrow(() -> rules.notFound(ref.localControlScopeId()));
    references.add(new OrganizationLocalDtos.ContextRef(row.getOrganizationSubprocessScopeId(), null)); controlIds.add(row.getControlId());
   } else { if (ref.controlId() == null || ref.contextRef() == null) throw rules.bad("Incomplete Control Scope reference"); references.add(ref.contextRef()); controlIds.add(ref.controlId()); }
  }
  for (var change : items(request.localRequirementPolicyChanges())) {
   var ref = change.requirementScopeRef();
   if (ref == null || (ref.localRequirementScopeId() == null) == (ref.contextRef() == null && ref.requirementId() == null)) throw rules.bad("Invalid exact Requirement Scope reference");
   if (ref.localRequirementScopeId() != null) {
    var row = requirementRows.findById(ref.localRequirementScopeId()).orElseThrow(() -> rules.notFound(ref.localRequirementScopeId()));
    references.add(new OrganizationLocalDtos.ContextRef(row.getOrganizationSubprocessScopeId(), null)); requirementIds.add(row.getRequirementId());
   } else { if (ref.requirementId() == null || ref.contextRef() == null) throw rules.bad("Incomplete Requirement Scope reference"); references.add(ref.contextRef()); requirementIds.add(ref.requirementId()); }
  }
  for (var ref : references) {
   if (ref == null || (ref.contextId() == null) == (ref.subprocessId() == null)) throw rules.bad("Invalid Context reference");
   if (ref.contextId() != null) { var row = contextRows.findById(ref.contextId()).orElseThrow(() -> rules.notFound(ref.contextId())); rules.assertOwner(orgId, row.getOrganizationId()); subprocessIds.add(row.getSubprocessId()); }
   else subprocessIds.add(ref.subprocessId());
  }
  for (var id : subprocessIds) subprocessRows.lockById(id).orElseThrow(() -> rules.referenceNotFound(id));
  items(request.localControlScopeChanges()).forEach(change -> controlIds.add(change.controlId()));
  items(request.localRequirementScopeChanges()).forEach(change -> requirementIds.add(change.requirementId()));
  for (var id : controlIds) rules.family(items(request.localControlScopeChanges()).stream().anyMatch(change -> id.equals(change.controlId())) ? "L2" : "L8", () -> controlEndpoints.lockById(id).orElseThrow(() -> rules.referenceNotFound(id)));
  for (var id : items(request.localRiskScopeChanges()).stream().map(OrganizationLocalDtos.RiskChange::riskTemplateId).distinct().sorted(Comparator.comparing(UUID::toString)).toList()) rules.family("L3", () -> riskEndpoints.lockById(id).orElseThrow(() -> rules.referenceNotFound(id)));
  for (var id : items(request.localControlObjectiveScopeChanges()).stream().map(OrganizationLocalDtos.ObjectiveChange::controlObjectiveId).distinct().sorted(Comparator.comparing(UUID::toString)).toList()) rules.family("L4", () -> objectiveEndpoints.lockById(id).orElseThrow(() -> rules.referenceNotFound(id)));
  for (var id : requirementIds) rules.family(items(request.localRequirementScopeChanges()).stream().anyMatch(change -> id.equals(change.requirementId())) ? "L5" : "L9", () -> requirementEndpoints.lockById(id).orElseThrow(() -> rules.referenceNotFound(id)));
  var policyIds = new TreeSet<UUID>(Comparator.comparing(UUID::toString));
  items(request.localOrganizationPolicyChanges()).forEach(change -> policyIds.add(change.policyId()));
  items(request.localContextPolicyChanges()).forEach(change -> policyIds.add(change.policyId()));
  items(request.localControlPolicyChanges()).forEach(change -> policyIds.add(change.policyId()));
  items(request.localRequirementPolicyChanges()).forEach(change -> policyIds.add(change.policyId()));
  for (var id : policyIds) {
   String family = items(request.localOrganizationPolicyChanges()).stream().anyMatch(change -> id.equals(change.policyId())) ? "L6"
       : items(request.localContextPolicyChanges()).stream().anyMatch(change -> id.equals(change.policyId())) ? "L7"
       : items(request.localControlPolicyChanges()).stream().anyMatch(change -> id.equals(change.policyId())) ? "L8" : "L9";
   rules.family(family, () -> policyEndpoints.lockById(id).orElseThrow(() -> rules.referenceNotFound(id)));
  }
  rules.family("B1", () -> { businessObjectives.lockOrganizationEndpoints(request.organizationObjectiveChanges()); return null; });
  rules.family("L2", () -> { controls.lockAggregateReferences(request.localControlScopeChanges()); return null; });
  rules.family("L3", () -> { risks.lockAggregateReferences(request.localRiskScopeChanges()); return null; });
  rules.family("L4", () -> { objectives.lockAggregateReferences(request.localControlObjectiveScopeChanges()); return null; });
  rules.family("L5", () -> { requirements.lockAggregateReferences(request.localRequirementScopeChanges()); return null; });
  return List.copyOf(references);
 }
 @Transactional(propagation = Propagation.MANDATORY)
 public Plan prepare(UUID orgId, OrganizationLocalDrafts request) {
  var references = lockEndpoints(orgId, request);
  var deleting = new OrganizationLocalDeletions(
      items(request.localControlScopeChanges()).stream().filter(change -> change.operation() == OrganizationLocalDtos.Operation.DELETE).map(OrganizationLocalDtos.ControlChange::scopeId).filter(Objects::nonNull).collect(java.util.stream.Collectors.toSet()),
      items(request.localRiskScopeChanges()).stream().filter(change -> change.operation() == OrganizationLocalDtos.Operation.DELETE).map(OrganizationLocalDtos.RiskChange::scopeId).filter(Objects::nonNull).collect(java.util.stream.Collectors.toSet()),
      items(request.localControlObjectiveScopeChanges()).stream().filter(change -> change.operation() == OrganizationLocalDtos.Operation.DELETE).map(OrganizationLocalDtos.ObjectiveChange::scopeId).filter(Objects::nonNull).collect(java.util.stream.Collectors.toSet()),
      items(request.localRequirementScopeChanges()).stream().filter(change -> change.operation() == OrganizationLocalDtos.Operation.DELETE).map(OrganizationLocalDtos.RequirementChange::scopeId).filter(Objects::nonNull).collect(java.util.stream.Collectors.toSet()),
      items(request.localContextPolicyChanges()).stream().filter(change -> change.operation() == OrganizationLocalDtos.Operation.DELETE).map(OrganizationLocalDtos.ContextPolicyChange::relationId).filter(Objects::nonNull).collect(java.util.stream.Collectors.toSet()),
      items(request.localControlPolicyChanges()).stream().filter(change -> change.operation() == OrganizationLocalDtos.Operation.DELETE).map(OrganizationLocalDtos.ControlPolicyChange::relationId).filter(Objects::nonNull).collect(java.util.stream.Collectors.toSet()),
      items(request.localRequirementPolicyChanges()).stream().filter(change -> change.operation() == OrganizationLocalDtos.Operation.DELETE).map(OrganizationLocalDtos.RequirementPolicyChange::relationId).filter(Objects::nonNull).collect(java.util.stream.Collectors.toSet()));
  var objectivePlan = rules.family("B1", () -> businessObjectives.prepareForOrganization(orgId, request.organizationObjectiveChanges(), false));
  var contextPlans = rules.family("L1", () -> contexts.prepareAggregate(orgId, request.subprocesses(), deleting));
  var resolved = new HashMap<OrganizationLocalDtos.ContextRef, LocalOrganizationSubprocessScopeEntity>();
  references.stream().distinct().sorted(Comparator.comparing(Object::toString)).forEach(ref -> resolved.put(ref, contexts.resolveAggregate(orgId, ref, contextPlans)));
  Function<LocalOrganizationSubprocessScopeEntity,MasterDataLifecycleStatus> contextStatus = row -> contextPlans.stream().filter(plan -> plan.row().getId().equals(row.getId())).map(LocalContextService.AggregatePlan::target).findFirst().orElse(row.getStatus());
  var controlsPlans = new ArrayList<LocalControlService.AggregatePlan>(); var controlsSeen = new HashSet<String>();
  for (var change : items(request.localControlScopeChanges()).stream().sorted(Comparator.comparing(Object::toString)).toList()) {
   var context = resolved.get(change.contextRef());
   if (!controlsSeen.add(context.getId()+":"+change.controlId())) throw rules.bad("Duplicate Local Control pair");
   controlsPlans.add(rules.family("L2", () -> controls.prepareAggregate(orgId, context, change, contextStatus.apply(context), deleting)));
  }
  var risksPlans = new ArrayList<LocalRiskService.AggregatePlan>(); var risksSeen = new HashSet<String>();
  for (var change : items(request.localRiskScopeChanges()).stream().sorted(Comparator.comparing(Object::toString)).toList()) {
   var context = resolved.get(change.contextRef());
   if (!risksSeen.add(context.getId()+":"+change.riskTemplateId())) throw rules.bad("Duplicate Local Risk pair");
   risksPlans.add(rules.family("L3", () -> risks.prepareAggregate(orgId, context, change, contextStatus.apply(context), deleting)));
  }
  var objectivesPlans = new ArrayList<LocalObjectiveService.AggregatePlan>(); var objectivesSeen = new HashSet<String>();
  for (var change : items(request.localControlObjectiveScopeChanges()).stream().sorted(Comparator.comparing(Object::toString)).toList()) {
   var context = resolved.get(change.contextRef());
   if (!objectivesSeen.add(context.getId()+":"+change.controlObjectiveId())) throw rules.bad("Duplicate Local Objective pair");
   objectivesPlans.add(rules.family("L4", () -> objectives.prepareAggregate(orgId, context, change, contextStatus.apply(context), deleting)));
  }
  var requirementsPlans = new ArrayList<LocalRequirementService.AggregatePlan>(); var requirementsSeen = new HashSet<String>();
  for (var change : items(request.localRequirementScopeChanges()).stream().sorted(Comparator.comparing(Object::toString)).toList()) {
   var context = resolved.get(change.contextRef());
   if (!requirementsSeen.add(context.getId()+":"+change.requirementId())) throw rules.bad("Duplicate Local Requirement pair");
   requirementsPlans.add(rules.family("L5", () -> requirements.prepareAggregate(orgId, context, change, contextStatus.apply(context), deleting)));
  }
  var org = organizations.findById(orgId).orElseThrow();
  var organizationPoliciesPlans = new ArrayList<LocalOrganizationPolicyService.AggregatePlan>(); var orgPolicySeen = new HashSet<UUID>();
  for (var change : items(request.localOrganizationPolicyChanges())) { if (!orgPolicySeen.add(change.policyId())) throw rules.bad("Duplicate Organization Policy pair"); organizationPoliciesPlans.add(rules.family("L6", () -> organizationPolicies.prepareAggregate(orgId, orgId, change, org.getStatus(), org.getValidFrom(), org.getValidTo()))); }
  var contextPoliciesPlans = new ArrayList<LocalContextPolicyService.AggregatePlan>(); var contextPolicySeen = new HashSet<String>();
  for (var change : items(request.localContextPolicyChanges())) { var context = resolved.get(change.contextRef()); if (!contextPolicySeen.add(context.getId()+":"+change.policyId())) throw rules.bad("Duplicate Context Policy pair"); contextPoliciesPlans.add(rules.family("L7", () -> contextPolicies.prepareAggregate(orgId, context.getId(), change, contextStatus.apply(context), context.getValidFrom(), context.getValidTo(), context, contextStatus.apply(context)))); }
  var controlPoliciesPlans = new ArrayList<LocalControlPolicyService.AggregatePlan>(); var controlPoliciesSeen = new HashSet<String>();
  for (var change : items(request.localControlPolicyChanges())) {
   var ref = change.controlScopeRef();
   var targetPlan = controlsPlans.stream().filter(plan -> ref.localControlScopeId() != null ? plan.row().getId().equals(ref.localControlScopeId())
       : plan.row().getOrganizationSubprocessScopeId().equals(resolved.get(ref.contextRef()).getId()) && plan.row().getControlId().equals(ref.controlId()) && (plan.fresh() || plan.row().getStatus() == MasterDataLifecycleStatus.DELETED)).findFirst().orElse(null);
   var target = targetPlan != null ? targetPlan.row() : ref.localControlScopeId() == null ? null : controlRows.lockById(ref.localControlScopeId()).orElseThrow(() -> rules.notFound(ref.localControlScopeId()));
   if (target == null) throw rules.bad("Exact Control Scope reference has no create/restore draft");
   var context = contextRows.findById(target.getOrganizationSubprocessScopeId()).orElseGet(() -> contextPlans.stream().map(LocalContextService.AggregatePlan::row).filter(row -> row.getId().equals(target.getOrganizationSubprocessScopeId())).findFirst().orElseThrow());
   rules.assertOwner(orgId, context.getOrganizationId());
   if (change.operation() != OrganizationLocalDtos.Operation.DELETE) rules.nonDeleted(contextStatus.apply(context));
   var state = targetPlan == null ? target.getStatus() : targetPlan.target();
   if (change.operation() != OrganizationLocalDtos.Operation.DELETE) rules.nonDeleted(state);
   if (!controlPoliciesSeen.add(target.getId()+":"+change.policyId())) throw rules.bad("Duplicate Control Policy pair");
   var from = targetPlan != null && targetPlan.metadata() ? targetPlan.change().validFrom() : target.getValidFrom();
   var to = targetPlan != null && targetPlan.metadata() ? targetPlan.change().validTo() : target.getValidTo();
   controlPoliciesPlans.add(rules.family("L8", () -> controlPolicies.prepareAggregate(orgId, target.getId(), change, state, from, to, context, contextStatus.apply(context), target.getControlId())));
  }
  var requirementPoliciesPlans = new ArrayList<LocalRequirementPolicyService.AggregatePlan>(); var requirementPoliciesSeen = new HashSet<String>();
  for (var change : items(request.localRequirementPolicyChanges())) {
   var ref = change.requirementScopeRef();
   var targetPlan = requirementsPlans.stream().filter(plan -> ref.localRequirementScopeId() != null ? plan.row().getId().equals(ref.localRequirementScopeId())
       : plan.row().getOrganizationSubprocessScopeId().equals(resolved.get(ref.contextRef()).getId()) && plan.row().getRequirementId().equals(ref.requirementId()) && (plan.fresh() || plan.row().getStatus() == MasterDataLifecycleStatus.DELETED)).findFirst().orElse(null);
   var target = targetPlan != null ? targetPlan.row() : ref.localRequirementScopeId() == null ? null : requirementRows.lockById(ref.localRequirementScopeId()).orElseThrow(() -> rules.notFound(ref.localRequirementScopeId()));
   if (target == null) throw rules.bad("Exact Requirement Scope reference has no create/restore draft");
   var context = contextRows.findById(target.getOrganizationSubprocessScopeId()).orElseGet(() -> contextPlans.stream().map(LocalContextService.AggregatePlan::row).filter(row -> row.getId().equals(target.getOrganizationSubprocessScopeId())).findFirst().orElseThrow());
   rules.assertOwner(orgId, context.getOrganizationId());
   if (change.operation() != OrganizationLocalDtos.Operation.DELETE) rules.nonDeleted(contextStatus.apply(context));
   var state = targetPlan == null ? target.getStatus() : targetPlan.target();
   if (change.operation() != OrganizationLocalDtos.Operation.DELETE) rules.nonDeleted(state);
   if (!requirementPoliciesSeen.add(target.getId()+":"+change.policyId())) throw rules.bad("Duplicate Requirement Policy pair");
   var from = targetPlan != null && targetPlan.metadata() ? targetPlan.change().validFrom() : target.getValidFrom();
   var to = targetPlan != null && targetPlan.metadata() ? targetPlan.change().validTo() : target.getValidTo();
   requirementPoliciesPlans.add(rules.family("L9", () -> requirementPolicies.prepareAggregate(orgId, target.getId(), change, state, from, to, context, contextStatus.apply(context), target.getRequirementId())));
  }
  return new Plan(orgId, request, contextPlans, controlsPlans, risksPlans, objectivesPlans, requirementsPlans, organizationPoliciesPlans, contextPoliciesPlans, controlPoliciesPlans, requirementPoliciesPlans, objectivePlan);
 }
 public record Plan(UUID orgId, OrganizationLocalDrafts request, List<LocalContextService.AggregatePlan> contextPlans,
     List<LocalControlService.AggregatePlan> controlsPlans,
     List<LocalRiskService.AggregatePlan> risksPlans,
     List<LocalObjectiveService.AggregatePlan> objectivesPlans,
     List<LocalRequirementService.AggregatePlan> requirementsPlans,
     List<LocalOrganizationPolicyService.AggregatePlan> organizationPoliciesPlans,
     List<LocalContextPolicyService.AggregatePlan> contextPoliciesPlans,
     List<LocalControlPolicyService.AggregatePlan> controlPoliciesPlans,
     List<LocalRequirementPolicyService.AggregatePlan> requirementPoliciesPlans,
     OrganizationObjectiveService.Plan objectivePlan) {}
 @Transactional(propagation = Propagation.MANDATORY)
 public OrganizationLocalDtos.Result apply(Plan prepared, UUID centralRevisionId) {
  var orgId = prepared.orgId(); var request = prepared.request(); var contextPlans = prepared.contextPlans(); var objectivePlan = prepared.objectivePlan();
  var controlsPlans = prepared.controlsPlans();
  var risksPlans = prepared.risksPlans();
  var objectivesPlans = prepared.objectivesPlans();
  var requirementsPlans = prepared.requirementsPlans();
  var organizationPoliciesPlans = prepared.organizationPoliciesPlans();
  var contextPoliciesPlans = prepared.contextPoliciesPlans();
  var controlPoliciesPlans = prepared.controlPoliciesPlans();
  var requirementPoliciesPlans = prepared.requirementPoliciesPlans();
  boolean changed = !objectivePlan.isEmpty() || contextPlans.stream().anyMatch(plan -> plan.fresh() || plan.row().getStatus() != plan.target())
      || controlsPlans.stream().anyMatch(controls::changesAggregate)
      || risksPlans.stream().anyMatch(risks::changesAggregate)
      || objectivesPlans.stream().anyMatch(objectives::changesAggregate)
      || requirementsPlans.stream().anyMatch(requirements::changesAggregate)
      || organizationPoliciesPlans.stream().anyMatch(organizationPolicies::changesAggregate)
      || contextPoliciesPlans.stream().anyMatch(contextPolicies::changesAggregate)
      || controlPoliciesPlans.stream().anyMatch(controlPolicies::changesAggregate)
      || requirementPoliciesPlans.stream().anyMatch(requirementPolicies::changesAggregate);
  UUID localRevisionId = null;
  if (changed) {
   var result = revisions.executeStructural(guards(request), RevisionRequest.local(orgId, "Save Organization relationships", "Organization aggregate", centralRevisionId), revision -> {
    var contents = new ArrayList<RevisionContentResult>();
    contextPlans.stream().filter(plan -> plan.target() != MasterDataLifecycleStatus.DELETED).map(contexts::applyAggregate).filter(Objects::nonNull).forEach(contents::add);
    organizationPoliciesPlans.stream().filter(plan -> plan.target() == MasterDataLifecycleStatus.DELETED).map(organizationPolicies::applyAggregate).filter(Objects::nonNull).forEach(contents::add);
    contextPoliciesPlans.stream().filter(plan -> plan.target() == MasterDataLifecycleStatus.DELETED).map(contextPolicies::applyAggregate).filter(Objects::nonNull).forEach(contents::add);
    controlPoliciesPlans.stream().filter(plan -> plan.target() == MasterDataLifecycleStatus.DELETED).map(controlPolicies::applyAggregate).filter(Objects::nonNull).forEach(contents::add);
    requirementPoliciesPlans.stream().filter(plan -> plan.target() == MasterDataLifecycleStatus.DELETED).map(requirementPolicies::applyAggregate).filter(Objects::nonNull).forEach(contents::add);
    controlsPlans.stream().map(controls::applyAggregate).filter(Objects::nonNull).forEach(contents::add);
    risksPlans.stream().map(risks::applyAggregate).filter(Objects::nonNull).forEach(contents::add);
    objectivesPlans.stream().map(objectives::applyAggregate).filter(Objects::nonNull).forEach(contents::add);
    requirementsPlans.stream().map(requirements::applyAggregate).filter(Objects::nonNull).forEach(contents::add);
    organizationPoliciesPlans.stream().filter(plan -> plan.target() != MasterDataLifecycleStatus.DELETED).map(organizationPolicies::applyAggregate).filter(Objects::nonNull).forEach(contents::add);
    contextPoliciesPlans.stream().filter(plan -> plan.target() != MasterDataLifecycleStatus.DELETED).map(contextPolicies::applyAggregate).filter(Objects::nonNull).forEach(contents::add);
    controlPoliciesPlans.stream().filter(plan -> plan.target() != MasterDataLifecycleStatus.DELETED).map(controlPolicies::applyAggregate).filter(Objects::nonNull).forEach(contents::add);
    requirementPoliciesPlans.stream().filter(plan -> plan.target() != MasterDataLifecycleStatus.DELETED).map(requirementPolicies::applyAggregate).filter(Objects::nonNull).forEach(contents::add);
    contextPlans.stream().filter(plan -> plan.target() == MasterDataLifecycleStatus.DELETED).map(contexts::applyAggregate).filter(Objects::nonNull).forEach(contents::add);
    contents.addAll(businessObjectives.apply(objectivePlan));
    var first = contents.get(0);
    return RevisionOperationResult.completed(revision, new MasterDataMutationResult(first.entityId(), revision.revisionId(), first.appliedEntityVersion()), contents);
   });
   localRevisionId = result.primaryResult().revisionId();
  }
  return new OrganizationLocalDtos.Result(localRevisionId, contextPlans.stream().map(contexts::canonical).toList(),
      controlsPlans.stream().map(controls::canonical).toList(),
      risksPlans.stream().map(risks::canonical).toList(),
      objectivesPlans.stream().map(objectives::canonical).toList(),
      requirementsPlans.stream().map(requirements::canonical).toList(),
      organizationPoliciesPlans.stream().map(organizationPolicies::canonical).toList(),
      contextPoliciesPlans.stream().map(contextPolicies::canonical).toList(),
      controlPoliciesPlans.stream().map(controlPolicies::canonical).toList(),
      requirementPoliciesPlans.stream().map(requirementPolicies::canonical).toList(),
      items(request.organizationObjectiveChanges()).isEmpty() ? List.of() : businessObjectives.canonicalForOrganization(orgId));
 }
}
