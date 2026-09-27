package com.digiaudit.grcpc.modules.masterdata.local.api;

import com.digiaudit.grcpc.modules.masterdata.local.api.dto.LocalOptionDtos;
import com.digiaudit.grcpc.modules.masterdata.local.application.LocalOptionsService;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/master-data/local/options")
public class LocalOptionsController {
  private final LocalOptionsService service;
  public LocalOptionsController(LocalOptionsService service) { this.service = service; }

  @GetMapping("/organizations")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS')")
  public LocalOptionDtos.Page<LocalOptionDtos.Catalog> organizations(
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.organizations(q, page, size, sort, direction);
  }

  @GetMapping("/subprocesses")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS')")
  public LocalOptionDtos.Page<LocalOptionDtos.Catalog> subprocesses(
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.subprocesses(q, page, size, sort, direction);
  }

  @GetMapping("/controls")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL')")
  public LocalOptionDtos.Page<LocalOptionDtos.Catalog> controls(
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.controls(q, page, size, sort, direction);
  }

  @GetMapping("/risk-templates")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('RISK')")
  public LocalOptionDtos.Page<LocalOptionDtos.Catalog> risks(
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.risks(q, page, size, sort, direction);
  }

  @GetMapping("/control-objectives")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL')")
  public LocalOptionDtos.Page<LocalOptionDtos.Catalog> objectives(
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.objectives(q, page, size, sort, direction);
  }

  @GetMapping("/requirements")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalOptionDtos.Page<LocalOptionDtos.Requirement> requirements(
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.requirements(q, page, size, sort, direction);
  }

  @GetMapping("/policies")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('GOVERNANCE')")
  public LocalOptionDtos.Page<LocalOptionDtos.Catalog> policies(
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.policies(q, page, size, sort, direction);
  }

  @GetMapping("/control-owners")
  @PreAuthorize("@masterDataAuthorization.canManage('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL')")
  public LocalOptionDtos.Page<LocalOptionDtos.Owner> owners(
      @RequestParam(required = false) String q,
      @RequestParam(defaultValue = "0") int page,
      @RequestParam(defaultValue = "25") int size,
      @RequestParam(defaultValue = "id") String sort,
      @RequestParam(defaultValue = "ASC") String direction) {
    return service.owners(q, page, size, sort, direction);
  }

  @GetMapping("/control-settings")
  @PreAuthorize("@masterDataAuthorization.canView('REFERENCE') and @masterDataAuthorization.canView('PROCESS') and @masterDataAuthorization.canView('CONTROL')")
  public LocalOptionDtos.ControlSettings settings() { return service.settings(); }
}
