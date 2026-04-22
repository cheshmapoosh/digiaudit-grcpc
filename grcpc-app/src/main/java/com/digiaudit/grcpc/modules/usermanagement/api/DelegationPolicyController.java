package com.digiaudit.grcpc.modules.usermanagement.api;

import com.digiaudit.grcpc.modules.usermanagement.api.dto.CreateDelegationPolicyRequest;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.IdResponse;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.request.UpdateDelegationPolicyRequest;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.response.DelegationPolicyDetailResponse;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.response.DelegationPolicySummaryResponse;
import com.digiaudit.grcpc.modules.usermanagement.application.DelegationPolicyService;
import com.digiaudit.grcpc.modules.usermanagement.application.query.DelegationPolicyQueryService;
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
@RequestMapping("/api/usermanagement/delegation-policies")
@RequiredArgsConstructor
public class DelegationPolicyController {

    private final DelegationPolicyService delegationPolicyService;
    private final DelegationPolicyQueryService delegationPolicyQueryService;

    @GetMapping
    @PreAuthorize("hasAuthority('ROLE_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<DelegationPolicySummaryResponse> getPolicies(@RequestParam(required = false) String locale) {
        log.debug("HTTP GET /api/usermanagement/delegation-policies?locale={}", locale);
        return delegationPolicyQueryService.getPolicies(locale);
    }

    @GetMapping("/{policyId}")
    @PreAuthorize("hasAuthority('ROLE_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public DelegationPolicyDetailResponse getPolicy(@PathVariable UUID policyId, @RequestParam(required = false) String locale) {
        log.debug("HTTP GET /api/usermanagement/delegation-policies/{}?locale={}", policyId, locale);
        return delegationPolicyQueryService.getPolicy(policyId, locale);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('ROLE_ASSIGN_DELEGATION') or hasAuthority('ROLE_ROOT_ADMIN')")
    public IdResponse createPolicy(@Valid @RequestBody CreateDelegationPolicyRequest request, HttpServletRequest httpServletRequest) {
        log.debug("HTTP POST /api/usermanagement/delegation-policies");
        return new IdResponse(delegationPolicyService.createPolicy(request, httpServletRequest));
    }

    @PutMapping("/{policyId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('ROLE_ASSIGN_DELEGATION') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void updatePolicy(
            @PathVariable UUID policyId,
            @Valid @RequestBody UpdateDelegationPolicyRequest request,
            HttpServletRequest httpServletRequest
    ) {
        log.debug("HTTP PUT /api/usermanagement/delegation-policies/{}", policyId);
        delegationPolicyService.updatePolicy(policyId, request, httpServletRequest);
    }
}
