package com.digiaudit.grcpc.modules.masterdata.local.application;

import java.util.Set;
import java.util.UUID;

/** Exact typed exclusions for dependents explicitly deleted by the same Organization command. */
public record OrganizationLocalDeletions(
    Set<UUID> controls,
    Set<UUID> risks,
    Set<UUID> controlObjectives,
    Set<UUID> requirements,
    Set<UUID> contextPolicies,
    Set<UUID> controlPolicies,
    Set<UUID> requirementPolicies) {
  public OrganizationLocalDeletions {
    controls = Set.copyOf(controls);
    risks = Set.copyOf(risks);
    controlObjectives = Set.copyOf(controlObjectives);
    requirements = Set.copyOf(requirements);
    contextPolicies = Set.copyOf(contextPolicies);
    controlPolicies = Set.copyOf(controlPolicies);
    requirementPolicies = Set.copyOf(requirementPolicies);
  }
}
