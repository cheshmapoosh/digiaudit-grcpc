package com.digiaudit.grcpc.modules.masterdata.objective.api;

import com.digiaudit.grcpc.modules.masterdata.objective.api.dto.ObjectiveOrganizationAssignmentRequest;
import com.digiaudit.grcpc.modules.masterdata.objective.api.dto.ObjectiveOrganizationAssignmentResponse;
import com.digiaudit.grcpc.modules.masterdata.objective.application.ObjectiveOrganizationAssignmentService;
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
public class ObjectiveOrganizationAssignmentController {

    private final ObjectiveOrganizationAssignmentService service;

    @GetMapping("/api/organizations/{organizationId}/objective-assignments")
    @PreAuthorize("hasAuthority('ORGANIZATION_VIEW') or hasAuthority('OBJECTIVE_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<ObjectiveOrganizationAssignmentResponse> listByOrganization(
            @PathVariable UUID organizationId
    ) {
        log.debug(
                "REST request to list objective organization assignments. organizationId={}",
                organizationId
        );
        return service.listByOrganization(organizationId);
    }

    @PostMapping("/api/objective-organization-assignments")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('ORGANIZATION_EDIT') or hasAuthority('OBJECTIVE_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public ObjectiveOrganizationAssignmentResponse assign(
            @Valid @RequestBody ObjectiveOrganizationAssignmentRequest request,
            HttpServletRequest httpRequest
    ) {
        log.debug(
                "REST request to assign objective to organization. organizationId={}, objectiveNodeId={}",
                request.organizationId(),
                request.objectiveNodeId()
        );
        return service.assign(request, httpRequest);
    }

    @DeleteMapping("/api/objective-organization-assignments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('ORGANIZATION_EDIT') or hasAuthority('OBJECTIVE_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void remove(@PathVariable UUID id, HttpServletRequest httpRequest) {
        log.debug("REST request to deactivate objective organization assignment. assignmentId={}", id);
        service.remove(id, httpRequest);
    }
}
