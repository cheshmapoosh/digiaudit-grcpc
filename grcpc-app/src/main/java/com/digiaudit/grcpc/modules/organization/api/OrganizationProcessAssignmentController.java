package com.digiaudit.grcpc.modules.organization.api;

import com.digiaudit.grcpc.modules.organization.api.dto.OrganizationProcessAssignmentRequest;
import com.digiaudit.grcpc.modules.organization.api.dto.OrganizationProcessAssignmentResponse;
import com.digiaudit.grcpc.modules.organization.application.OrganizationProcessAssignmentService;
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
public class OrganizationProcessAssignmentController {

    private final OrganizationProcessAssignmentService service;

    @GetMapping("/api/organizations/{organizationId}/process-assignments")
    @PreAuthorize("hasAuthority('ORGANIZATION_VIEW') or hasAuthority('PROCESS_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<OrganizationProcessAssignmentResponse> listByOrganization(@PathVariable UUID organizationId) {
        log.debug("REST request to list organization process assignments. organizationId={}", organizationId);
        return service.listByOrganization(organizationId);
    }

    @PostMapping("/api/organization-process-assignments")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('ORGANIZATION_EDIT') or hasAuthority('PROCESS_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public OrganizationProcessAssignmentResponse assign(@Valid @RequestBody OrganizationProcessAssignmentRequest request, HttpServletRequest httpRequest) {
        return service.assign(request, httpRequest);
    }

    @DeleteMapping("/api/organization-process-assignments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('ORGANIZATION_EDIT') or hasAuthority('PROCESS_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void remove(@PathVariable UUID id, HttpServletRequest httpRequest) {
        service.remove(id, httpRequest);
    }
}
