package com.digiaudit.grcpc.modules.regulation.api;

import com.digiaudit.grcpc.modules.regulation.api.dto.*;
import com.digiaudit.grcpc.modules.regulation.application.RegulationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/regulations")
@RequiredArgsConstructor
public class RegulationController {

    private final RegulationService regulationService;

    @GetMapping
    @PreAuthorize("hasAuthority('REGULATION_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<RegulationResponse> findAll() {
        return regulationService.findAll();
    }

    @GetMapping("/roots")
    @PreAuthorize("hasAuthority('REGULATION_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<RegulationResponse> findRoots() {
        return regulationService.findRoots();
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('REGULATION_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public RegulationResponse findById(@PathVariable UUID id) {
        return regulationService.findById(id);
    }

    @GetMapping("/{id}/children")
    @PreAuthorize("hasAuthority('REGULATION_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<RegulationResponse> findChildren(@PathVariable UUID id) {
        return regulationService.findChildren(id);
    }

    @GetMapping("/children/{id}")
    @PreAuthorize("hasAuthority('REGULATION_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<RegulationResponse> findChildrenByUiPath(@PathVariable UUID id) {
        return regulationService.findChildren(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('REGULATION_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public RegulationResponse create(@Valid @RequestBody CreateRegulationRequest request) {
        return regulationService.create(request);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('REGULATION_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public RegulationResponse update(@PathVariable UUID id, @Valid @RequestBody UpdateRegulationRequest request) {
        return regulationService.update(id, request);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('REGULATION_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public RegulationResponse updateStatus(@PathVariable UUID id, @Valid @RequestBody UpdateRegulationStatusRequest request) {
        return regulationService.updateStatus(id, request);
    }

    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasAuthority('REGULATION_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public RegulationResponse toggleStatus(@PathVariable UUID id) {
        return regulationService.toggleStatus(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('REGULATION_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void delete(@PathVariable UUID id) {
        regulationService.delete(id);
    }
}
