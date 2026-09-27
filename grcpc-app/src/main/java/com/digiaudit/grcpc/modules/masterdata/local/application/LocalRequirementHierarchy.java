package com.digiaudit.grcpc.modules.masterdata.local.application;

import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.repository.CentralRegulationGroupRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.repository.CentralRegulationRepository;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.repository.CentralRegulationRequirementRepository;
import java.util.UUID;
import org.springframework.stereotype.Component;

/** Historical Local rows display current Requirement ancestry, including deleted definitions. */
@Component
public class LocalRequirementHierarchy {
  private final CentralRegulationRequirementRepository requirements;
  private final CentralRegulationRepository regulations;
  private final CentralRegulationGroupRepository groups;
  private final LocalCommandRules rules;

  public LocalRequirementHierarchy(CentralRegulationRequirementRepository requirements,
      CentralRegulationRepository regulations, CentralRegulationGroupRepository groups,
      LocalCommandRules rules) {
    this.requirements = requirements;
    this.regulations = regulations;
    this.groups = groups;
    this.rules = rules;
  }

  public Labels labels(UUID requirementId) {
    var requirement = requirements.findById(requirementId)
        .orElseThrow(() -> rules.referenceNotFound(requirementId));
    var regulation = regulations.findById(requirement.getRegulationId())
        .orElseThrow(() -> rules.referenceNotFound(requirement.getRegulationId()));
    var group = groups.findById(regulation.getRegulationGroupId())
        .orElseThrow(() -> rules.referenceNotFound(regulation.getRegulationGroupId()));
    return new Labels(regulation.getId(), regulation.getCode(), regulation.getTitle(),
        group.getId(), group.getCode(), group.getTitle());
  }

  public record Labels(UUID regulationId, String regulationCode, String regulationLabel,
      UUID regulationGroupId, String regulationGroupCode, String regulationGroupLabel) {}
}
