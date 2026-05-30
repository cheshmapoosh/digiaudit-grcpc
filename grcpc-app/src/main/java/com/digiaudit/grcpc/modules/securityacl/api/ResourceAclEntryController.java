package com.digiaudit.grcpc.modules.securityacl.api;

import com.digiaudit.grcpc.modules.securityacl.api.dto.ResourceAclEntryRequest;
import com.digiaudit.grcpc.modules.securityacl.api.dto.ResourceAclEntryResponse;
import com.digiaudit.grcpc.modules.securityacl.application.ResourceAclEntryService;
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
@RequestMapping("/api/security/resource-acl")
@RequiredArgsConstructor
public class ResourceAclEntryController {

    private final ResourceAclEntryService service;

    @GetMapping
    @PreAuthorize("hasAuthority('ACL_MANAGE') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<ResourceAclEntryResponse> list(@RequestParam String targetType, @RequestParam UUID targetId) {
        log.debug("REST request to list resource ACL. targetType={}, targetId={}", targetType, targetId);
        return service.list(targetType, targetId);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('ACL_MANAGE') or hasAuthority('ROLE_ROOT_ADMIN')")
    public ResourceAclEntryResponse upsert(@RequestBody ResourceAclEntryRequest request, HttpServletRequest httpRequest) {
        return service.upsert(request, httpRequest);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('ACL_MANAGE') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void delete(@PathVariable UUID id, HttpServletRequest httpRequest) {
        service.delete(id, httpRequest);
    }
}
