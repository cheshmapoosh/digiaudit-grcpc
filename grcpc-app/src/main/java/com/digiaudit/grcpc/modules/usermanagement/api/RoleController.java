package com.digiaudit.grcpc.modules.usermanagement.api;

import com.digiaudit.grcpc.modules.usermanagement.api.dto.CreateRoleRequest;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.IdResponse;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.ReplaceBusinessPermissionsRequest;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.ReplaceSystemPermissionsRequest;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.request.UpdateRoleRequest;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.response.PermissionResponse;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.response.RoleDetailResponse;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.response.RoleSummaryResponse;
import com.digiaudit.grcpc.modules.usermanagement.application.RoleManagementService;
import com.digiaudit.grcpc.modules.usermanagement.application.query.RoleQueryService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/usermanagement/roles")
@RequiredArgsConstructor
public class RoleController {

    private final RoleManagementService roleManagementService;
    private final RoleQueryService roleQueryService;

    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<RoleSummaryResponse> getRoles(@RequestParam(required = false) String locale) {
        log.debug("HTTP GET /api/usermanagement/roles?locale={}", locale);
        return roleQueryService.getRoles(locale);
    }

    @GetMapping("/{roleId}")
    @PreAuthorize("hasAuthority('ROLE_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public RoleDetailResponse getRole(@PathVariable UUID roleId, @RequestParam(required = false) String locale) {
        log.debug("HTTP GET /api/usermanagement/roles/{}?locale={}", roleId, locale);
        return roleQueryService.getRole(roleId, locale);
    }

    @GetMapping("/permissions")
    @PreAuthorize("hasAuthority('ROLE_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<PermissionResponse> getSystemPermissions(@RequestParam(required = false) String locale) {
        log.debug("HTTP GET /api/usermanagement/roles/permissions?locale={}", locale);
        return roleQueryService.getSystemPermissions(locale);
    }

    @GetMapping("/business-permissions")
    @PreAuthorize("hasAuthority('ROLE_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<PermissionResponse> getBusinessPermissions(@RequestParam(required = false) String locale) {
        log.debug("HTTP GET /api/usermanagement/roles/business-permissions?locale={}", locale);
        return roleQueryService.getBusinessPermissions(locale);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('ROLE_CREATE') or hasAuthority('ROLE_ROOT_ADMIN')")
    public IdResponse createRole(@Valid @RequestBody CreateRoleRequest request, HttpServletRequest httpServletRequest) {
        log.debug("HTTP POST /api/usermanagement/roles for code={}", request.code());
        return new IdResponse(roleManagementService.createRole(request, httpServletRequest));
    }

    @PutMapping("/{roleId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('ROLE_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void updateRole(
            @PathVariable UUID roleId,
            @Valid @RequestBody UpdateRoleRequest request,
            HttpServletRequest httpServletRequest
    ) {
        log.debug("HTTP PUT /api/usermanagement/roles/{}", roleId);
        roleManagementService.updateRole(roleId, request, httpServletRequest);
    }

    @PatchMapping("/{roleId}/enable")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('ROLE_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void enableRole(@PathVariable UUID roleId, HttpServletRequest httpServletRequest) {
        log.debug("HTTP PATCH /api/usermanagement/roles/{}/enable", roleId);
        roleManagementService.enableRole(roleId, httpServletRequest);
    }

    @PatchMapping("/{roleId}/disable")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('ROLE_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void disableRole(@PathVariable UUID roleId, HttpServletRequest httpServletRequest) {
        log.debug("HTTP PATCH /api/usermanagement/roles/{}/disable", roleId);
        roleManagementService.disableRole(roleId, httpServletRequest);
    }

    @PutMapping("/{roleId}/permissions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('ROLE_ASSIGN_PERMISSION') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void replaceSystemPermissions(
            @PathVariable UUID roleId,
            @Valid @RequestBody ReplaceSystemPermissionsRequest request,
            HttpServletRequest httpServletRequest
    ) {
        roleManagementService.replaceSystemPermissions(
                roleId,
                request.permissions().stream().map(Enum::name).collect(Collectors.toSet()),
                httpServletRequest
        );
    }

    @PutMapping("/{roleId}/business-permissions")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('ROLE_ASSIGN_BUSINESS_PERMISSION') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void replaceBusinessPermissions(
            @PathVariable UUID roleId,
            @Valid @RequestBody ReplaceBusinessPermissionsRequest request,
            HttpServletRequest httpServletRequest
    ) {
        roleManagementService.replaceBusinessPermissions(
                roleId,
                request.permissions().stream().map(Enum::name).collect(Collectors.toSet()),
                httpServletRequest
        );
    }
}
