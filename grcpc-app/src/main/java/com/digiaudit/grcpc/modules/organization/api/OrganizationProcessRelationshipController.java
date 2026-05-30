package com.digiaudit.grcpc.modules.organization.api;

import com.digiaudit.grcpc.modules.organization.api.dto.OrganizationControlViewResponse;
import com.digiaudit.grcpc.modules.organization.api.dto.OrganizationRiskAssignmentRequest;
import com.digiaudit.grcpc.modules.organization.api.dto.OrganizationRiskAssignmentResponse;
import com.digiaudit.grcpc.modules.organization.application.OrganizationProcessRelationshipService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequiredArgsConstructor
public class OrganizationProcessRelationshipController {

    private final OrganizationProcessRelationshipService service;

    @GetMapping("/api/organizations/{organizationId}/controls")
    @PreAuthorize("hasAuthority('ORGANIZATION_VIEW') or hasAuthority('CONTROL_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<OrganizationControlViewResponse> listControls(@PathVariable UUID organizationId) {
        log.debug("REST request to list organization controls. organizationId={}", organizationId);
        return service.listControls(organizationId);
    }

    @GetMapping("/api/organizations/{organizationId}/risk-assignments")
    @PreAuthorize("hasAuthority('ORGANIZATION_VIEW') or hasAuthority('RISK_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<OrganizationRiskAssignmentResponse> listRisks(@PathVariable UUID organizationId) {
        log.debug("REST request to list organization risk assignments. organizationId={}", organizationId);
        return service.listRisks(organizationId);
    }

    @PostMapping("/api/organization-risk-assignments")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('ORGANIZATION_EDIT') or hasAuthority('RISK_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public OrganizationRiskAssignmentResponse assignRisk(
            @Valid @RequestBody OrganizationRiskAssignmentRequest request,
            HttpServletRequest httpRequest
    ) {
        return service.assignRisk(request, httpRequest);
    }

    @DeleteMapping("/api/organization-risk-assignments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('ORGANIZATION_EDIT') or hasAuthority('RISK_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void removeRiskAssignment(@PathVariable UUID id, HttpServletRequest httpRequest) {
        service.removeRiskAssignment(id, httpRequest);
    }
}
