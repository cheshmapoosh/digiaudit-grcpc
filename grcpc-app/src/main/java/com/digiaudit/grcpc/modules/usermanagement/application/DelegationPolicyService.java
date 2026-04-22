package com.digiaudit.grcpc.modules.usermanagement.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.audit.application.AuditService;
import com.digiaudit.grcpc.modules.audit.domain.enums.ActionResult;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditEventType;
import com.digiaudit.grcpc.modules.audit.domain.enums.AuditTargetType;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.CreateDelegationPolicyRequest;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.request.UpdateDelegationPolicyRequest;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.AppUserEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.DelegationAssignableRoleEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.DelegationPolicyEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.RoleEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.enums.ScopeType;
import com.digiaudit.grcpc.modules.usermanagement.domain.enums.SubjectType;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.AppUserRepository;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.DelegationAssignableRoleRepository;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.DelegationPolicyRepository;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.RoleRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class DelegationPolicyService {

    private final DelegationPolicyRepository delegationPolicyRepository;
    private final DelegationAssignableRoleRepository delegationAssignableRoleRepository;
    private final RoleRepository roleRepository;
    private final AppUserRepository appUserRepository;
    private final CurrentUserProvider currentUserProvider;
    private final AuditService auditService;

    @Transactional
    public UUID createPolicy(CreateDelegationPolicyRequest request, HttpServletRequest httpServletRequest) {
        currentUserProvider.assertCurrentUserIsRoot();
        validateSubject(request.subjectType(), request.subjectRoleId(), request.subjectUserId());
        validateScope(request.scopeType(), request.scopeOrgUnitId());

        RoleEntity subjectRole = request.subjectRoleId() == null ? null : roleRepository.findById(request.subjectRoleId())
                .orElseThrow(() -> new NotFoundException("Subject role was not found"));

        AppUserEntity subjectUser = request.subjectUserId() == null ? null : appUserRepository.findById(request.subjectUserId())
                .orElseThrow(() -> new NotFoundException("Subject user was not found"));

        UUID actorUserId = currentUserProvider.getCurrentUserIdOrNull();
        log.info("Creating delegation policy. actorUserId={}, subjectType={}", actorUserId, request.subjectType());
        DelegationPolicyEntity policy = delegationPolicyRepository.save(
                DelegationPolicyEntity.builder()
                        .subjectType(request.subjectType())
                        .subjectRole(subjectRole)
                        .subjectUser(subjectUser)
                        .allowCreateUser(request.allowCreateUser())
                        .allowEditUser(request.allowEditUser())
                        .allowDisableUser(request.allowDisableUser())
                        .allowAssignRoles(request.allowAssignRoles())
                        .allowCreateRole(request.allowCreateRole())
                        .allowEditRole(request.allowEditRole())
                        .allowAssignBusinessPermissions(request.allowAssignBusinessPermissions())
                        .scopeType(request.scopeType())
                        .scopeOrgUnitId(request.scopeOrgUnitId())
                        .allowSubtree(request.allowSubtree())
                        .manageableUserMode(request.manageableUserMode())
                        .enabled(request.enabled())
                        .createdBy(actorUserId)
                        .updatedBy(actorUserId)
                        .build()
        );

        replaceAssignableRoles(policy, request.assignableRoleIds());

        auditService.log(
                AuditEventType.DELEGATION_POLICY_CREATED,
                AuditTargetType.DELEGATION_POLICY,
                policy.getId().toString(),
                ActionResult.SUCCESS,
                actorUserId,
                httpServletRequest,
                Map.of("subjectType", request.subjectType().name())
        );

        return policy.getId();
    }

    @Transactional
    public void updatePolicy(UUID policyId, UpdateDelegationPolicyRequest request, HttpServletRequest httpServletRequest) {
        currentUserProvider.assertCurrentUserIsRoot();
        validateScope(request.scopeType(), request.scopeOrgUnitId());

        DelegationPolicyEntity policy = delegationPolicyRepository.findById(policyId)
                .orElseThrow(() -> new NotFoundException("Delegation policy was not found"));

        UUID actorUserId = currentUserProvider.getCurrentUserIdOrNull();
        log.info("Updating delegation policy. actorUserId={}, policyId={}", actorUserId, policyId);

        policy.setAllowCreateUser(request.allowCreateUser());
        policy.setAllowEditUser(request.allowEditUser());
        policy.setAllowDisableUser(request.allowDisableUser());
        policy.setAllowAssignRoles(request.allowAssignRoles());
        policy.setAllowCreateRole(request.allowCreateRole());
        policy.setAllowEditRole(request.allowEditRole());
        policy.setAllowAssignBusinessPermissions(request.allowAssignBusinessPermissions());
        policy.setScopeType(request.scopeType());
        policy.setScopeOrgUnitId(request.scopeOrgUnitId());
        policy.setAllowSubtree(request.allowSubtree());
        policy.setManageableUserMode(request.manageableUserMode());
        policy.setEnabled(request.enabled());
        policy.setUpdatedBy(actorUserId);
        delegationPolicyRepository.save(policy);

        replaceAssignableRoles(policy, request.assignableRoleIds());

        auditService.log(
                AuditEventType.DELEGATION_POLICY_UPDATED,
                AuditTargetType.DELEGATION_POLICY,
                policy.getId().toString(),
                ActionResult.SUCCESS,
                actorUserId,
                httpServletRequest,
                Map.of("enabled", policy.isEnabled(), "subjectType", policy.getSubjectType().name())
        );
    }

    private void replaceAssignableRoles(DelegationPolicyEntity policy, java.util.Set<UUID> assignableRoleIds) {
        delegationAssignableRoleRepository.deleteAllByDelegationPolicy(policy);
        if (assignableRoleIds == null || assignableRoleIds.isEmpty()) {
            return;
        }
        List<RoleEntity> assignableRoles = roleRepository.findAllByIdIn(assignableRoleIds);
        if (assignableRoles.size() != assignableRoleIds.size()) {
            throw new NotFoundException("One or more assignable roles were not found");
        }
        assignableRoles.forEach(role -> delegationAssignableRoleRepository.save(
                DelegationAssignableRoleEntity.builder()
                        .delegationPolicy(policy)
                        .assignableRole(role)
                        .build()
        ));
    }

    private void validateSubject(SubjectType subjectType, UUID subjectRoleId, UUID subjectUserId) {
        if (subjectType == SubjectType.ROLE) {
            if (subjectRoleId == null || subjectUserId != null) {
                throw new ConflictException("For ROLE subject type, subjectRoleId is required and subjectUserId must be null");
            }
            return;
        }
        if (subjectUserId == null || subjectRoleId != null) {
            throw new ConflictException("For USER subject type, subjectUserId is required and subjectRoleId must be null");
        }
    }

    private void validateScope(ScopeType scopeType, UUID scopeOrgUnitId) {
        boolean orgScope = scopeType == ScopeType.ORG_UNIT || scopeType == ScopeType.ORG_SUBTREE;
        if (orgScope && scopeOrgUnitId == null) {
            throw new ConflictException("scopeOrgUnitId is required for ORG_UNIT and ORG_SUBTREE");
        }
        if (!orgScope && scopeOrgUnitId != null) {
            throw new ConflictException("scopeOrgUnitId must be null for GLOBAL and SELF");
        }
    }
}
