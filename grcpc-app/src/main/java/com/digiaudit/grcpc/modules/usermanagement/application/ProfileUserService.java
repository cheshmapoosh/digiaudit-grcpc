package com.digiaudit.grcpc.modules.usermanagement.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.common.security.ProfileContext;
import com.digiaudit.grcpc.modules.datasetprofile.application.ProfileAccessService;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.*;
import com.digiaudit.grcpc.modules.usermanagement.domain.enums.ScopeType;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.*;
import java.time.LocalDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor
public class ProfileUserService {
    private final ProfileAccessService access;
    private final AppUserRepository users;
    private final RoleRepository roles;
    private final UserRoleAssignmentRepository assignments;
    private final CurrentUserProvider current;
    private final JdbcTemplate jdbc;

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    public void configure(AppUserEntity user, UUID profileId, Boolean profileAdmin, List<UUID> accessIds, boolean create) {
        access.requireManager();
        boolean admin = Boolean.TRUE.equals(profileAdmin);
        if (!access.isRoot()) {
            if (admin || (accessIds != null && !accessIds.isEmpty())) ProfileAccessService.deny();
            if (!create) access.requireManagedUser(user);
            if (profileId == null || !ProfileContext.requireId().equals(profileId)) ProfileAccessService.deny();
        }
        if (user.isRootUser()) {
            if (admin || profileId != null || (accessIds != null && !accessIds.isEmpty())) ProfileAccessService.deny();
            return;
        }
        UUID targetProfile = admin ? null : profileId;
        if (!create && (!Objects.equals(user.getProfileId(), targetProfile) || user.isProfileAdmin() != admin)) {
            current.assertCurrentUserIsRoot();
            requireNoOwnershipDependencies(user);
        }
        if (admin) {
            current.assertCurrentUserIsRoot();
            if (profileId != null) throw new ConflictException("Profile Admin has no ordinary dataset membership");
            user.setProfileAdmin(true); user.setProfileId(null);
        } else {
            if (profileId == null) throw new ConflictException("PROFILE_REQUIRED", "profile.required", "An ordinary user requires exactly one profile");
            access.validate(profileId, current.getCurrentPrincipal().getUserId(), access.isRoot(), true, true);
            user.setProfileAdmin(false); user.setProfileId(profileId);
        }
    }

    private void requireNoOwnershipDependencies(AppUserEntity user) {
        if (user.getProfileId() == null) return;
        Long organizations = jdbc.queryForObject("select count(*) from organization_owner_assignment where profile_id = ? and user_id = ? and status = 'ACTIVE'",
                Long.class, ProfileContext.raw(user.getProfileId()), user.getId().toString());
        Long controls = jdbc.queryForObject("select count(*) from local_subprocess_control_scope where profile_id = ? and actual_owner_id = ?",
                Long.class, ProfileContext.raw(user.getProfileId()), ProfileContext.raw(user.getId()));
        if ((organizations != null && organizations > 0) || (controls != null && controls > 0))
            throw new ConflictException("USER_OWNERSHIP_DEPENDENCIES", "profile.ownershipDependencies", "Reassign existing business ownership before changing account membership");
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    public void validateDefaultOrganization(AppUserEntity user, UUID organizationId, boolean membershipChanged) {
        if (organizationId == null || (!membershipChanged && Objects.equals(organizationId, user.getDefaultOrgUnitId()))) return;
        if (user.getProfileId() == null) ProfileAccessService.deny();
        Long count = jdbc.queryForObject("select count(*) from organization where profile_id = ? and id = ? and status <> 'DELETED'",
                Long.class, ProfileContext.raw(user.getProfileId()), ProfileContext.raw(organizationId));
        if (count == null || count == 0) ProfileAccessService.deny();
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    public void saveAccess(AppUserEntity user, List<UUID> accessIds) {
        if (!access.isRoot() || accessIds == null) return;
        var ids = new TreeSet<UUID>(accessIds == null ? List.of() : accessIds);
        var retained = accessIds(user.getId());
        if (!user.isProfileAdmin() && !ids.isEmpty()) ProfileAccessService.deny();
        for (UUID id : ids) {
            // Root may retain/grant access to an inactive dataset; only data mutation requires ACTIVE.
            if (!retained.contains(id)) access.validate(id, current.getCurrentPrincipal().getUserId(), true, false, true);
        }
        users.flush();
        jdbc.update("delete from profile_admin_access where user_id = ?", user.getId().toString());
        for (UUID id : ids) jdbc.update("insert into profile_admin_access (profile_id, user_id, granted_by, granted_at) values (?, ?, ?, systimestamp)",
                ProfileContext.raw(id), user.getId().toString(), current.getCurrentPrincipal().getUserId().toString());
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.MANDATORY)
    public void replaceRoles(AppUserEntity user, UUID profileId, List<UUID> roleIds,
            List<com.digiaudit.grcpc.modules.usermanagement.api.dto.ProfileRoleGrantRequest> grants) {
        access.requireManagedUser(user);
        if (roleIds == null && grants == null) return; // Older callers preserve existing grants.
        if (grants != null && grants.stream().anyMatch(Objects::isNull)) throw new ConflictException("Role grants cannot contain null items");
        if (roleIds == null) roleIds = grants.stream().map(g -> g.roleId()).toList();
        if (user.isRootUser()) { if (!roleIds.isEmpty()) ProfileAccessService.deny(); return; }
        if (user.isProfileAdmin() && profileId == null && roleIds.isEmpty()) return;
        if (profileId == null || (!user.isProfileAdmin() && !profileId.equals(user.getProfileId()))) ProfileAccessService.deny();
        if (user.isProfileAdmin() && !access.isAdmin(user.getId(), profileId)) ProfileAccessService.deny();
        var selected = new HashSet<>(roleIds);
        if (selected.contains(null) || selected.size() != roleIds.size()) throw new ConflictException("Invalid or duplicate role selection");
        Map<UUID, com.digiaudit.grcpc.modules.usermanagement.api.dto.ProfileRoleGrantRequest> periods = new HashMap<>();
        if (grants != null) {
            for (var grant : grants) {
                if (grant.roleId() == null || periods.putIfAbsent(grant.roleId(), grant) != null
                        || (grant.validFrom() != null && grant.validTo() != null && grant.validTo().isBefore(grant.validFrom())))
                    throw new ConflictException("Invalid role validity or duplicate role");
            }
            if (!periods.keySet().equals(selected)) throw new ConflictException("Role selection and validity must describe the same grants");
        }
        var existing = assignments.findAllByUser_IdAndProfileIdOrderByAssignedAtDesc(user.getId(), profileId).stream()
                .filter(a -> profileId.equals(a.getProfileId()) && a.getScopeType() == ScopeType.GLOBAL && a.getScopeOrgUnitId() == null).toList();
        for (UUID roleId : selected) {
            var role = roles.findById(roleId).orElseThrow(() -> new NotFoundException("Role was not found"));
            if ("PROFILE_ADMIN".equals(role.getCode())) ProfileAccessService.deny();
            var active = existing.stream().filter(a -> a.isActive() && a.getRole().getId().equals(roleId)).findFirst().orElse(null);
            boolean retained = active != null;
            var period = periods.get(roleId);
            boolean changesValidity = retained && period != null
                    && (!Objects.equals(active.getValidFrom(), period.validFrom()) || !Objects.equals(active.getValidTo(), period.validTo()));
            if (!retained && (!role.isEnabled() || (!access.isRoot() && "ROOT_ADMIN".equals(role.getCode())))) ProfileAccessService.deny();
            if (changesValidity && (!role.isEnabled() || (!access.isRoot() && "ROOT_ADMIN".equals(role.getCode())))) ProfileAccessService.deny();
            if (changesValidity) { active.setValidFrom(period.validFrom()); active.setValidTo(period.validTo()); }
            if (!retained) assignments.save(UserRoleAssignmentEntity.builder().user(user).role(role).profileId(profileId)
                    .scopeType(ScopeType.GLOBAL).active(true).assignedAt(LocalDateTime.now())
                    .validFrom(period == null ? null : period.validFrom()).validTo(period == null ? null : period.validTo())
                    .assignedBy(current.getCurrentPrincipal().getUserId()).build());
        }
        existing.stream().filter(a -> a.isActive() && !selected.contains(a.getRole().getId())).forEach(a -> a.setActive(false));
    }

    @Transactional(readOnly = true)
    public List<UUID> accessIds(UUID userId) {
        return jdbc.query("select profile_id from profile_admin_access where user_id = ? order by profile_id",
                (rs, n) -> { var b = java.nio.ByteBuffer.wrap(rs.getBytes(1)); return new UUID(b.getLong(), b.getLong()); }, userId.toString());
    }

    public record RoleChoice(UUID id, String code, String title) {}
    @Transactional(readOnly = true)
    public List<RoleChoice> roleChoices(String locale) {
        access.requireManager();
        return roles.findAll().stream().filter(r -> r.isEnabled() && !"PROFILE_ADMIN".equals(r.getCode())
                && (access.isRoot() || !"ROOT_ADMIN".equals(r.getCode())))
                .map(r -> new RoleChoice(r.getId(), r.getCode(), r.getTranslations().stream()
                    .filter(t -> t.getLocale().equals(locale == null ? "fa" : locale)).findFirst()
                    .map(t -> t.getTitle()).orElse(r.getCode())))
                .sorted(Comparator.comparing(RoleChoice::title)).toList();
    }

}
