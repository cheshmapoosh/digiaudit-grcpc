package com.digiaudit.grcpc.modules.masterdata.local.api.dto;
import java.util.List;
import com.digiaudit.grcpc.modules.masterdata.objective.api.OrganizationObjectiveChange;
public interface OrganizationLocalDrafts {
 List<LocalContextDtos.ContextChange> subprocesses();
 List<OrganizationLocalDtos.ControlChange> localControlScopeChanges();
 List<OrganizationLocalDtos.RiskChange> localRiskScopeChanges();
 List<OrganizationLocalDtos.ObjectiveChange> localControlObjectiveScopeChanges();
 List<OrganizationLocalDtos.RequirementChange> localRequirementScopeChanges();
 List<OrganizationLocalDtos.OrganizationPolicyChange> localOrganizationPolicyChanges();
 List<OrganizationLocalDtos.ContextPolicyChange> localContextPolicyChanges();
 List<OrganizationLocalDtos.ControlPolicyChange> localControlPolicyChanges();
 List<OrganizationLocalDtos.RequirementPolicyChange> localRequirementPolicyChanges();
 List<OrganizationObjectiveChange> organizationObjectiveChanges();
}
