package com.digiaudit.grcpc.modules.organization.api;

import com.digiaudit.grcpc.modules.organization.api.dto.OrganizationReferenceAssignmentRequest;
import com.digiaudit.grcpc.modules.organization.api.dto.OrganizationReferenceAssignmentResponse;
import com.digiaudit.grcpc.modules.organization.application.OrganizationReferenceAssignmentService;
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
public class OrganizationReferenceAssignmentController {

    private final OrganizationReferenceAssignmentService service;

    @GetMapping("/api/organizations/{organizationId}/reference-assignments")
    @PreAuthorize("hasAuthority('ORGANIZATION_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<OrganizationReferenceAssignmentResponse> listByOrganization(
            @PathVariable UUID organizationId,
            @RequestParam String referenceType
    ) {
        log.debug(
                "REST request to list organization reference assignments. organizationId={}, referenceType={}",
                organizationId,
                referenceType
        );
        return service.listByOrganization(organizationId, referenceType);
    }

    @PostMapping("/api/organization-reference-assignments")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('ORGANIZATION_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public OrganizationReferenceAssignmentResponse assign(
            @Valid @RequestBody OrganizationReferenceAssignmentRequest request,
            HttpServletRequest httpRequest
    ) {
        return service.assign(request, httpRequest);
    }

    @DeleteMapping("/api/organization-reference-assignments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('ORGANIZATION_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void remove(@PathVariable UUID id, HttpServletRequest httpRequest) {
        service.remove(id, httpRequest);
    }
}
