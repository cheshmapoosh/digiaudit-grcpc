package com.digiaudit.grcpc.modules.masterdata.objective.api;

import com.digiaudit.grcpc.modules.masterdata.objective.application.ObjectiveService;
import com.digiaudit.grcpc.modules.masterdata.objective.application.OrganizationObjectiveService;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataAggregateMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/objectives")
public class ObjectiveController {
  private final ObjectiveService service;
  private final OrganizationObjectiveService organizationObjectives;
  public ObjectiveController(ObjectiveService service,
      OrganizationObjectiveService organizationObjectives) {
    this.service = service;
    this.organizationObjectives = organizationObjectives;
  }

  @GetMapping
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE')")
  public List<ObjectiveDtos.Detail> list() { return service.list(); }

  @GetMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE')")
  public ObjectiveDtos.Detail detail(@PathVariable UUID id) { return service.get(id); }

  @GetMapping("/{id}/organizations")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE')")
  public List<OrganizationObjectiveDtos.OrganizationLink> organizations(@PathVariable UUID id,
      @RequestParam(required = false) com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus lifecycleStatus) {
    return organizationObjectives.listOrganizations(id, lifecycleStatus);
  }

  @PostMapping
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE')")
  public ObjectiveDtos.AggregateResponse create(@Valid @RequestBody ObjectiveDtos.Create request) {
    return service.create(request);
  }

  @PutMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE')")
  public ObjectiveDtos.AggregateResponse update(@PathVariable UUID id,
      @Valid @RequestBody ObjectiveDtos.Update request) { return service.update(id, request); }

  @DeleteMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE')")
  public MasterDataRevisionMutationResponse delete(@PathVariable UUID id, @RequestParam Long version) {
    return service.delete(id, version);
  }

  @PostMapping("/{id}/restore")
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE')")
  public MasterDataRevisionMutationResponse restore(@PathVariable UUID id,
      @Valid @RequestBody ObjectiveDtos.Restore request) {
    return service.restore(id, request.version(), request.parentObjectiveId());
  }
}
