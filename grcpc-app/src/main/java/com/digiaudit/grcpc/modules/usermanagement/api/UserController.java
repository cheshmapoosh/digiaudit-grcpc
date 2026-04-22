package com.digiaudit.grcpc.modules.usermanagement.api;

import com.digiaudit.grcpc.modules.usermanagement.api.dto.AssignRoleRequest;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.CreateUserRequest;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.IdResponse;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.request.UpdateUserRequest;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.response.UserDetailResponse;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.response.UserRoleAssignmentResponse;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.response.UserSummaryResponse;
import com.digiaudit.grcpc.modules.usermanagement.application.UserManagementService;
import com.digiaudit.grcpc.modules.usermanagement.application.query.UserQueryService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@Slf4j
@RestController
@RequestMapping("/api/usermanagement/users")
@RequiredArgsConstructor
public class UserController {

    private final UserManagementService userManagementService;
    private final UserQueryService userQueryService;

    @GetMapping
    @PreAuthorize("hasAuthority('USER_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<UserSummaryResponse> getUsers() {
        log.debug("HTTP GET /api/usermanagement/users");
        return userQueryService.getUsers();
    }

    @GetMapping("/{userId}")
    @PreAuthorize("hasAuthority('USER_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public UserDetailResponse getUser(
            @PathVariable UUID userId,
            @RequestParam(required = false) String locale
    ) {
        log.debug("HTTP GET /api/usermanagement/users/{}?locale={}", userId, locale);
        return userQueryService.getUser(userId, locale);
    }

    @GetMapping("/{userId}/roles")
    @PreAuthorize("hasAuthority('USER_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<UserRoleAssignmentResponse> getUserAssignments(
            @PathVariable UUID userId,
            @RequestParam(required = false) String locale
    ) {
        log.debug("HTTP GET /api/usermanagement/users/{}/roles?locale={}", userId, locale);
        return userQueryService.getUserAssignments(userId, locale);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('USER_CREATE') or hasAuthority('ROLE_ROOT_ADMIN')")
    public IdResponse createUser(@Valid @RequestBody CreateUserRequest request, HttpServletRequest httpServletRequest) {
        log.debug("HTTP POST /api/usermanagement/users for username={}", request.username());
        return new IdResponse(userManagementService.createUser(request, httpServletRequest));
    }

    @PutMapping("/{userId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('USER_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void updateUser(
            @PathVariable UUID userId,
            @Valid @RequestBody UpdateUserRequest request,
            HttpServletRequest httpServletRequest
    ) {
        log.debug("HTTP PUT /api/usermanagement/users/{}", userId);
        userManagementService.updateUser(userId, request, httpServletRequest);
    }

    @PatchMapping("/{userId}/enable")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('USER_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void enableUser(@PathVariable UUID userId, HttpServletRequest httpServletRequest) {
        log.debug("HTTP PATCH /api/usermanagement/users/{}/enable", userId);
        userManagementService.enableUser(userId, httpServletRequest);
    }

    @PatchMapping("/{userId}/disable")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('USER_DISABLE') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void disableUser(@PathVariable UUID userId, HttpServletRequest httpServletRequest) {
        log.debug("HTTP PATCH /api/usermanagement/users/{}/disable", userId);
        userManagementService.disableUser(userId, httpServletRequest);
    }

    @PostMapping("/{userId}/roles")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('USER_ASSIGN_ROLE') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void assignRole(
            @PathVariable UUID userId,
            @Valid @RequestBody AssignRoleRequest request,
            HttpServletRequest httpServletRequest
    ) {
        log.debug("HTTP POST /api/usermanagement/users/{}/roles", userId);
        userManagementService.assignRole(userId, request, httpServletRequest);
    }
}
