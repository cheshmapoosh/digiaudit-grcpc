package com.digiaudit.grcpc.modules.organization.api;

import com.digiaudit.grcpc.modules.organization.api.dto.*;
import com.digiaudit.grcpc.modules.organization.application.OrganizationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/organizations")
@RequiredArgsConstructor
public class OrganizationController {

    private final OrganizationService organizationService;

    @GetMapping
    @PreAuthorize("hasAuthority('ORGANIZATION_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<OrganizationResponse> findAll() {
        return organizationService.findAll();
    }

    @GetMapping("/roots")
    @PreAuthorize("hasAuthority('ORGANIZATION_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<OrganizationResponse> findRoots() {
        return organizationService.findRoots();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ORGANIZATION_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public OrganizationResponse findById(@PathVariable UUID id) {
        return organizationService.findById(id);
    }

    @GetMapping("/{id}/children")
    @PreAuthorize("hasAuthority('ORGANIZATION_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<OrganizationResponse> findChildren(@PathVariable UUID id) {
        return organizationService.findChildren(id);
    }

    @GetMapping("/children/{id}")
    @PreAuthorize("hasAuthority('ORGANIZATION_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<OrganizationResponse> findChildrenByUiPath(@PathVariable UUID id) {
        return organizationService.findChildren(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('ORGANIZATION_CREATE') or hasAuthority('ORGANIZATION_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public OrganizationResponse create(@Valid @RequestBody CreateOrganizationRequest request) {
        return organizationService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ORGANIZATION_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public OrganizationResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateOrganizationRequest request) {
        return organizationService.update(id, request);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('ORGANIZATION_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public OrganizationResponse updateStatus(@PathVariable UUID id, @Valid @RequestBody UpdateOrganizationStatusRequest request) {
        return organizationService.updateStatus(id, request);
    }

    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasAuthority('ORGANIZATION_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public OrganizationResponse toggleStatus(@PathVariable UUID id) {
        return organizationService.toggleStatus(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('ORGANIZATION_DELETE') or hasAuthority('ORGANIZATION_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void delete(@PathVariable UUID id) {
        organizationService.delete(id);
    }
}
