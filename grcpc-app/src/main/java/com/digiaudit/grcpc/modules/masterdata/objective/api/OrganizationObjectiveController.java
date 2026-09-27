package com.digiaudit.grcpc.modules.masterdata.objective.api;

import com.digiaudit.grcpc.modules.masterdata.objective.application.OrganizationObjectiveService;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/organizations/{organizationId}/objectives")
public class OrganizationObjectiveController {
  private final OrganizationObjectiveService service;
  public OrganizationObjectiveController(OrganizationObjectiveService service) { this.service = service; }

  @GetMapping
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE')")
  public List<OrganizationObjectiveDtos.Detail> list(@PathVariable UUID organizationId) {
    return service.list(organizationId);
  }

  @PostMapping
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE')")
  public MasterDataRevisionMutationResponse assign(@PathVariable UUID organizationId,
      @Valid @RequestBody OrganizationObjectiveDtos.Create request) {
    return service.assign(organizationId, request);
  }

  @PutMapping("/{objectiveId}")
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE')")
  public MasterDataRevisionMutationResponse update(@PathVariable UUID organizationId,
      @PathVariable UUID objectiveId, @Valid @RequestBody OrganizationObjectiveDtos.Update request) {
    return service.update(organizationId, objectiveId, request);
  }

  @DeleteMapping("/{objectiveId}")
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE')")
  public MasterDataRevisionMutationResponse remove(@PathVariable UUID organizationId,
      @PathVariable UUID objectiveId, @RequestParam Long version) {
    return service.remove(organizationId, objectiveId, version);
  }
}
