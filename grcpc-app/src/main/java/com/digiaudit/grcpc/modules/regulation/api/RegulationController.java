package com.digiaudit.grcpc.modules.regulation.api;

import com.digiaudit.grcpc.modules.regulation.api.dto.*;
import com.digiaudit.grcpc.modules.regulation.application.RegulationService;
import com.digiaudit.grcpc.modules.regulation.domain.enums.RegulationNodeType;
import jakarta.servlet.http.HttpServletRequest;
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
    public List<RegulationResponse> findAll(@RequestParam(required = false) String nodeType) {
        return regulationService.findAll(nodeType == null ? null : RegulationNodeType.fromJson(nodeType));
    }

    @GetMapping("/roots")
    @PreAuthorize("hasAuthority('REGULATION_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<RegulationResponse> findRoots() {
        return regulationService.findRoots();
    }

    @GetMapping("/groups")
    @PreAuthorize("hasAuthority('REGULATION_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<RegulationResponse> findGroups() {
        return regulationService.findByNodeType(RegulationNodeType.GROUP);
    }

    @GetMapping("/laws")
    @PreAuthorize("hasAuthority('REGULATION_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<RegulationResponse> findLaws() {
        return regulationService.findByNodeType(RegulationNodeType.LAW);
    }

    @GetMapping("/requirements")
    @PreAuthorize("hasAuthority('REGULATION_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<RegulationResponse> findRequirements() {
        return regulationService.findByNodeType(RegulationNodeType.REQUIREMENT);
    }

    @GetMapping("/types/{nodeType}")
    @PreAuthorize("hasAuthority('REGULATION_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<RegulationResponse> findByNodeType(@PathVariable String nodeType) {
        return regulationService.findByNodeType(RegulationNodeType.fromJson(nodeType));
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
    public RegulationResponse create(@Valid @RequestBody CreateRegulationRequest request, HttpServletRequest httpRequest) {
        return regulationService.create(request, httpRequest);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('REGULATION_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public RegulationResponse update(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateRegulationRequest request,
            HttpServletRequest httpRequest
    ) {
        return regulationService.update(id, request, httpRequest);
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasAuthority('REGULATION_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public RegulationResponse updateStatus(
            @PathVariable UUID id,
            @Valid @RequestBody UpdateRegulationStatusRequest request,
            HttpServletRequest httpRequest
    ) {
        return regulationService.updateStatus(id, request, httpRequest);
    }

    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasAuthority('REGULATION_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public RegulationResponse toggleStatus(@PathVariable UUID id, HttpServletRequest httpRequest) {
        return regulationService.toggleStatus(id, httpRequest);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('REGULATION_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void delete(@PathVariable UUID id, HttpServletRequest httpRequest) {
        regulationService.delete(id, httpRequest);
    }
}
