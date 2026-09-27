package com.digiaudit.grcpc.modules.masterdata.globalcontrol.api;

import com.digiaudit.grcpc.modules.masterdata.catalog.shared.api.dto.CatalogLifecycleCommandRequest;
import com.digiaudit.grcpc.modules.masterdata.globalcontrol.application.GlobalControlRegulationService;
import com.digiaudit.grcpc.modules.masterdata.globalcontrol.application.GlobalControlService;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataAggregateMutationResponse;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/global-controls")
public class GlobalControlController {
  private final GlobalControlService controls;
  private final GlobalControlRegulationService regulations;

  public GlobalControlController(GlobalControlService controls,
      GlobalControlRegulationService regulations) {
    this.controls = controls;
    this.regulations = regulations;
  }

  @GetMapping
  @PreAuthorize("@masterDataAuthorization.canView('CONTROL')")
  public List<GlobalControlDtos.Detail> list() { return controls.list(); }

  @GetMapping("/regulation-options")
  @PreAuthorize("@masterDataAuthorization.canView('CONTROL')")
  public List<GlobalControlRegulationDtos.RegulationOption> regulationOptions() {
    return regulations.options();
  }

  @GetMapping("/regulation-selection")
  @PreAuthorize("@masterDataAuthorization.canView('CONTROL')")
  public GlobalControlRegulationDtos.SelectionOptions regulationSelection() {
    return regulations.selectionOptions();
  }

  @GetMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canView('CONTROL')")
  public GlobalControlDtos.Detail detail(@PathVariable UUID id) { return controls.get(id); }

  @PostMapping
  @PreAuthorize("@masterDataAuthorization.canManage('CONTROL')")
  public MasterDataAggregateMutationResponse create(@Valid @RequestBody GlobalControlDtos.Create request) {
    return controls.create(request);
  }

  @PutMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canManage('CONTROL')")
  public MasterDataAggregateMutationResponse update(@PathVariable UUID id,
      @Valid @RequestBody GlobalControlDtos.Update request) {
    return controls.update(id, request);
  }

  @DeleteMapping("/{id}")
  @PreAuthorize("@masterDataAuthorization.canManage('CONTROL')")
  public MasterDataRevisionMutationResponse delete(@PathVariable UUID id, @RequestParam Long version) {
    return controls.delete(id, version);
  }

  @PostMapping("/{id}/restore")
  @PreAuthorize("@masterDataAuthorization.canManage('CONTROL')")
  public MasterDataRevisionMutationResponse restore(@PathVariable UUID id,
      @Valid @RequestBody CatalogLifecycleCommandRequest request) {
    return controls.restore(id, request.version());
  }

  @GetMapping("/{id}/regulations")
  @PreAuthorize("@masterDataAuthorization.canView('CONTROL')")
  public List<GlobalControlRegulationDtos.Link> relatedRegulations(@PathVariable UUID id) {
    return regulations.list(id);
  }

  @PostMapping("/{id}/regulations")
  @PreAuthorize("@masterDataAuthorization.canManage('CONTROL')")
  public MasterDataRevisionMutationResponse attachRegulation(@PathVariable UUID id,
      @Valid @RequestBody GlobalControlRegulationDtos.Attach request) {
    return regulations.attach(id, request.regulationId());
  }

  @DeleteMapping("/{id}/regulations/{regulationId}")
  @PreAuthorize("@masterDataAuthorization.canManage('CONTROL')")
  public MasterDataRevisionMutationResponse removeRegulation(@PathVariable UUID id,
      @PathVariable UUID regulationId, @RequestParam Long version) {
    return regulations.remove(id, regulationId, version);
  }
}
