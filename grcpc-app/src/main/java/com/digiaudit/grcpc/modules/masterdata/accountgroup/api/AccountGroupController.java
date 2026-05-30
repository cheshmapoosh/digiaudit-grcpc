package com.digiaudit.grcpc.modules.masterdata.accountgroup.api;

import com.digiaudit.grcpc.modules.masterdata.accountgroup.api.dto.AccountGroupRequest;
import com.digiaudit.grcpc.modules.masterdata.accountgroup.api.dto.AccountGroupResponse;
import com.digiaudit.grcpc.modules.masterdata.accountgroup.application.AccountGroupService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/account-groups")
@RequiredArgsConstructor
public class AccountGroupController {
    private final AccountGroupService accountGroupService;

    @GetMapping
    @PreAuthorize("hasAuthority('ACCOUNT_GROUP_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<AccountGroupResponse> findAll() {
        log.debug("REST request to find all account groups");
        return accountGroupService.findAll();
    }

    @GetMapping("/roots")
    @PreAuthorize("hasAuthority('ACCOUNT_GROUP_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<AccountGroupResponse> findRoots() {
        return accountGroupService.findRoots();
    }

    @GetMapping("/children/{parentId}")
    @PreAuthorize("hasAuthority('ACCOUNT_GROUP_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<AccountGroupResponse> findChildren(@PathVariable UUID parentId) {
        return accountGroupService.findChildren(parentId);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('ACCOUNT_GROUP_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public AccountGroupResponse findById(@PathVariable UUID id) {
        return accountGroupService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('ACCOUNT_GROUP_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public AccountGroupResponse create(@RequestBody AccountGroupRequest request, HttpServletRequest httpRequest) {
        return accountGroupService.create(request, httpRequest);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('ACCOUNT_GROUP_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public AccountGroupResponse update(@PathVariable UUID id, @RequestBody AccountGroupRequest request, HttpServletRequest httpRequest) {
        return accountGroupService.update(id, request, httpRequest);
    }

    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasAuthority('ACCOUNT_GROUP_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public AccountGroupResponse toggleStatus(@PathVariable UUID id, HttpServletRequest httpRequest) {
        return accountGroupService.toggleStatus(id, httpRequest);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('ACCOUNT_GROUP_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void delete(@PathVariable UUID id, HttpServletRequest httpRequest) {
        accountGroupService.delete(id, httpRequest);
    }
}
