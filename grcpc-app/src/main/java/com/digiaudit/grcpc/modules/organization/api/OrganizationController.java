package com.digiaudit.grcpc.modules.organization.api;

import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataAggregateMutationResponse;
import com.digiaudit.grcpc.modules.organization.api.dto.CreateOrganizationRequest;
import com.digiaudit.grcpc.modules.organization.api.dto.MoveOrganizationRequest;
import com.digiaudit.grcpc.modules.organization.api.dto.OrganizationLifecycleCommandRequest;
import com.digiaudit.grcpc.modules.organization.api.dto.OrganizationResponse;
import com.digiaudit.grcpc.modules.organization.api.dto.OrganizationTreeNodeResponse;
import com.digiaudit.grcpc.modules.organization.api.dto.UpdateOrganizationRequest;
import com.digiaudit.grcpc.modules.organization.application.OrganizationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/master-data/organizations")
@RequiredArgsConstructor
public class OrganizationController {
    private final OrganizationService organizationService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('ORGANIZATION_CREATE') or hasAuthority('ORGANIZATION_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public MasterDataAggregateMutationResponse create(@Valid @RequestBody CreateOrganizationRequest request) {
        return organizationService.create(request);
    }

    @GetMapping
    @PreAuthorize("hasAuthority('ORGANIZATION_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<OrganizationResponse> findAll(
            @RequestParam(required = false) String lifecycleStatus
    ) {
        return organizationService.findAll(lifecycleStatus);
    }

    @GetMapping("/tree")
    @PreAuthorize("hasAuthority('ORGANIZATION_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<OrganizationTreeNodeResponse> findTree() {
        return organizationService.findTree();
    }

    @GetMapping("/{organizationId}")
    @PreAuthorize("hasAuthority('ORGANIZATION_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public OrganizationResponse findById(@PathVariable UUID organizationId) {
        return organizationService.findById(organizationId);
    }

    @PatchMapping("/{organizationId}")
    @PreAuthorize("hasAuthority('ORGANIZATION_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public MasterDataAggregateMutationResponse update(
            @PathVariable UUID organizationId,
            @Valid @RequestBody UpdateOrganizationRequest request
    ) {
        return organizationService.update(organizationId, request);
    }

    @PostMapping("/{organizationId}/move")
    @PreAuthorize("hasAuthority('ORGANIZATION_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public MasterDataRevisionMutationResponse move(
            @PathVariable UUID organizationId,
            @Valid @RequestBody MoveOrganizationRequest request
    ) {
        return organizationService.move(organizationId, request);
    }

    @PostMapping("/{organizationId}/activate")
    @PreAuthorize("hasAuthority('ORGANIZATION_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public MasterDataRevisionMutationResponse activate(
            @PathVariable UUID organizationId,
            @Valid @RequestBody OrganizationLifecycleCommandRequest request
    ) {
        return organizationService.activate(organizationId, request);
    }

    @PostMapping("/{organizationId}/inactivate")
    @PreAuthorize("hasAuthority('ORGANIZATION_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public MasterDataRevisionMutationResponse inactivate(
            @PathVariable UUID organizationId,
            @Valid @RequestBody OrganizationLifecycleCommandRequest request
    ) {
        return organizationService.inactivate(organizationId, request);
    }

    @PostMapping("/{organizationId}/delete")
    @PreAuthorize("hasAuthority('ORGANIZATION_DELETE') or hasAuthority('ORGANIZATION_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public MasterDataRevisionMutationResponse delete(
            @PathVariable UUID organizationId,
            @Valid @RequestBody OrganizationLifecycleCommandRequest request
    ) {
        return organizationService.delete(organizationId, request);
    }

    @PostMapping("/{organizationId}/restore")
    @PreAuthorize("hasAuthority('ORGANIZATION_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public MasterDataRevisionMutationResponse restore(
            @PathVariable UUID organizationId,
            @Valid @RequestBody OrganizationLifecycleCommandRequest request
    ) {
        return organizationService.restore(organizationId, request);
    }
}
