package com.digiaudit.grcpc.modules.organization.api;

import com.digiaudit.grcpc.modules.organization.api.dto.*;
import com.digiaudit.grcpc.modules.organization.application.OrganizationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/organizations")
@RequiredArgsConstructor
public class OrganizationController {

    private final OrganizationService organizationService;

    @GetMapping
    public List<OrganizationResponse> findAll() {
        return organizationService.findAll();
    }

    @GetMapping("/roots")
    public List<OrganizationResponse> findRoots() {
        return organizationService.findRoots();
    }

    @GetMapping("/{id}")
    public OrganizationResponse findById(@PathVariable UUID id) {
        return organizationService.findById(id);
    }

    @GetMapping("/{id}/children")
    public List<OrganizationResponse> findChildren(@PathVariable UUID id) {
        return organizationService.findChildren(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public OrganizationResponse create(@Valid @RequestBody CreateOrganizationRequest request) {
        return organizationService.create(request);
    }

    @PutMapping("/{id}")
    public OrganizationResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateOrganizationRequest request) {
        return organizationService.update(id, request);
    }

    @PatchMapping("/{id}/status")
    public OrganizationResponse updateStatus(@PathVariable UUID id, @Valid @RequestBody UpdateOrganizationStatusRequest request) {
        return organizationService.updateStatus(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID id) {
        organizationService.delete(id);
    }
}
