package com.digiaudit.grcpc.modules.masterdata.policy.api;

import com.digiaudit.grcpc.modules.masterdata.policy.api.dto.PolicyNodeRequest;
import com.digiaudit.grcpc.modules.masterdata.policy.api.dto.PolicyNodeResponse;
import com.digiaudit.grcpc.modules.masterdata.policy.application.PolicyService;
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
@RequestMapping("/api/policies")
@RequiredArgsConstructor
public class PolicyController {
    private final PolicyService policyService;

    @GetMapping
    @PreAuthorize("hasAuthority('POLICY_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<PolicyNodeResponse> findAll(@RequestParam(required = false) String nodeType) {
        log.debug("REST request to find all policies");
        return policyService.findAll(nodeType);
    }

    @GetMapping("/roots")
    @PreAuthorize("hasAuthority('POLICY_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<PolicyNodeResponse> findRoots() {
        return policyService.findRoots();
    }

    @GetMapping("/groups")
    @PreAuthorize("hasAuthority('POLICY_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<PolicyNodeResponse> findGroups() {
        return policyService.findByNodeType("policyGroup");
    }

    @GetMapping("/types/{nodeType}")
    @PreAuthorize("hasAuthority('POLICY_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<PolicyNodeResponse> findByNodeType(@PathVariable String nodeType) {
        return policyService.findByNodeType(nodeType);
    }

    @GetMapping("/children/{parentId}")
    @PreAuthorize("hasAuthority('POLICY_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<PolicyNodeResponse> findChildren(@PathVariable UUID parentId) {
        return policyService.findChildren(parentId);
    }

    @GetMapping("/{id}/children")
    @PreAuthorize("hasAuthority('POLICY_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<PolicyNodeResponse> findChildrenByObjectPath(@PathVariable UUID id) {
        return policyService.findChildren(id);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('POLICY_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public PolicyNodeResponse findById(@PathVariable UUID id) {
        return policyService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('POLICY_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public PolicyNodeResponse create(@RequestBody PolicyNodeRequest request, HttpServletRequest httpRequest) {
        return policyService.create(request, httpRequest);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('POLICY_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public PolicyNodeResponse update(@PathVariable UUID id, @RequestBody PolicyNodeRequest request, HttpServletRequest httpRequest) {
        return policyService.update(id, request, httpRequest);
    }

    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasAuthority('POLICY_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public PolicyNodeResponse toggleStatus(@PathVariable UUID id, HttpServletRequest httpRequest) {
        return policyService.toggleStatus(id, httpRequest);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('POLICY_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void delete(@PathVariable UUID id, HttpServletRequest httpRequest) {
        policyService.delete(id, httpRequest);
    }
}
