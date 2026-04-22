package com.digiaudit.grcpc.modules.usermanagement.application.query;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.response.DelegationPolicyDetailResponse;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.response.DelegationPolicySummaryResponse;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.response.LocalizedTextResponse;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.response.RoleSummaryResponse;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.DelegationAssignableRoleEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.DelegationPolicyEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.RoleEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.DelegationAssignableRoleRepository;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.DelegationPolicyRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DelegationPolicyQueryService {

    private final DelegationPolicyRepository delegationPolicyRepository;
    private final DelegationAssignableRoleRepository delegationAssignableRoleRepository;
    private final CurrentUserProvider currentUserProvider;
    private final LocalizationSupport localizationSupport;

    @Transactional(readOnly = true)
    public List<DelegationPolicySummaryResponse> getPolicies(String locale) {
        currentUserProvider.assertCurrentUserIsRoot();
        String normalizedLocale = localizationSupport.normalizeLocale(locale);
        log.debug("Loading delegation policy list. locale={}", normalizedLocale);
        return delegationPolicyRepository.findAll().stream()
                .sorted(Comparator.comparing(DelegationPolicyEntity::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(policy -> toSummary(policy, normalizedLocale))
                .toList();
    }

    @Transactional(readOnly = true)
    public DelegationPolicyDetailResponse getPolicy(UUID policyId, String locale) {
        currentUserProvider.assertCurrentUserIsRoot();
        String normalizedLocale = localizationSupport.normalizeLocale(locale);
        DelegationPolicyEntity policy = delegationPolicyRepository.findById(policyId)
                .orElseThrow(() -> new NotFoundException("Delegation policy was not found"));

        List<RoleSummaryResponse> assignableRoles = delegationAssignableRoleRepository.findAllByDelegationPolicy(policy).stream()
                .map(DelegationAssignableRoleEntity::getAssignableRole)
                .map(role -> toRoleSummary(role, normalizedLocale))
                .sorted(Comparator.comparing(RoleSummaryResponse::code))
                .toList();

        return new DelegationPolicyDetailResponse(
                policy.getId(),
                policy.getSubjectType(),
                policy.getSubjectRole() != null ? policy.getSubjectRole().getId() : null,
                policy.getSubjectRole() != null ? policy.getSubjectRole().getCode() : null,
                policy.getSubjectRole() != null ? resolveRoleTitle(policy.getSubjectRole(), normalizedLocale) : null,
                policy.getSubjectUser() != null ? policy.getSubjectUser().getId() : null,
                policy.getSubjectUser() != null ? policy.getSubjectUser().getUsername() : null,
                policy.isAllowCreateUser(),
                policy.isAllowEditUser(),
                policy.isAllowDisableUser(),
                policy.isAllowAssignRoles(),
                policy.isAllowCreateRole(),
                policy.isAllowEditRole(),
                policy.isAllowAssignBusinessPermissions(),
                policy.getScopeType(),
                policy.getScopeOrgUnitId(),
                policy.isAllowSubtree(),
                policy.getManageableUserMode(),
                policy.isEnabled(),
                assignableRoles,
                policy.getCreatedAt(),
                policy.getUpdatedAt()
        );
    }

    private DelegationPolicySummaryResponse toSummary(DelegationPolicyEntity policy, String locale) {
        return new DelegationPolicySummaryResponse(
                policy.getId(),
                policy.getSubjectType(),
                policy.getSubjectRole() != null ? policy.getSubjectRole().getId() : null,
                policy.getSubjectRole() != null ? policy.getSubjectRole().getCode() : null,
                policy.getSubjectRole() != null ? resolveRoleTitle(policy.getSubjectRole(), locale) : null,
                policy.getSubjectUser() != null ? policy.getSubjectUser().getId() : null,
                policy.getSubjectUser() != null ? policy.getSubjectUser().getUsername() : null,
                policy.getScopeType(),
                policy.getScopeOrgUnitId(),
                policy.isEnabled(),
                policy.isAllowCreateUser(),
                policy.isAllowEditUser(),
                policy.isAllowDisableUser(),
                policy.isAllowAssignRoles(),
                policy.isAllowCreateRole(),
                policy.isAllowEditRole(),
                policy.isAllowAssignBusinessPermissions(),
                policy.isAllowSubtree(),
                policy.getManageableUserMode(),
                policy.getCreatedAt(),
                policy.getUpdatedAt()
        );
    }

    private RoleSummaryResponse toRoleSummary(RoleEntity role, String locale) {
        return new RoleSummaryResponse(
                role.getId(),
                role.getCode(),
                resolveRoleTitle(role, locale),
                localizationSupport.resolveRoleText(role.getTranslations(), locale).map(LocalizedTextResponse::description).orElse(null),
                role.isSystemDefined(),
                role.isEnabled(),
                role.getCreatedAt()
        );
    }

    private String resolveRoleTitle(RoleEntity role, String locale) {
        return localizationSupport.resolveRoleText(role.getTranslations(), locale)
                .map(LocalizedTextResponse::title)
                .orElse(role.getCode());
    }
}
