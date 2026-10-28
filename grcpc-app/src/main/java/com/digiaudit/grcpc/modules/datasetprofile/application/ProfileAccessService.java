package com.digiaudit.grcpc.modules.datasetprofile.application;

import com.digiaudit.grcpc.common.exception.ForbiddenException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.common.security.ProfileContext;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;

@Service("profileAccess")
@RequiredArgsConstructor
public class ProfileAccessService {
    private final JdbcTemplate jdbc;
    private final CurrentUserProvider currentUser;

    public boolean isRoot() { return currentUser.getCurrentPrincipalOptional().map(p -> p.isRootUser()).orElse(false); }
    public boolean isAdmin() {
        return ProfileContext.idOrNull() != null && currentUser.getCurrentUserIdOptional()
                .map(id -> isAdmin(id, ProfileContext.requireId())).orElse(false);
    }
    public boolean canManageUsers() { return isRoot() || isAdmin(); }
    public boolean isAdmin(UUID userId, UUID profileId) {
        return jdbc.queryForObject("select count(*) from profile_admin_access a join app_user u on u.id = a.user_id "
                        + "where a.profile_id = ? and a.user_id = ? and u.profile_admin = 1 and u.enabled = 1 and u.locked = 0 "
                        + "and exists (select 1 from role r where r.code = 'PROFILE_ADMIN' and r.enabled = 1)",
                Long.class, ProfileContext.raw(profileId), userId.toString()) > 0;
    }
    public void validate(UUID profileId, UUID userId, boolean root, boolean write, boolean lock) {
        var states = jdbc.query("select status from dataset_profile where id = ?" + (lock ? " for update" : ""),
                (rs, n) -> rs.getString(1), ProfileContext.raw(profileId));
        if (states.isEmpty() || "DELETED".equals(states.getFirst())) deny();
        if (!root) {
            Long ordinary = jdbc.queryForObject("select count(*) from app_user where id = ? and profile_id = ? "
                    + "and enabled = 1 and locked = 0 and root_user = 0 and profile_admin = 0",
                    Long.class, userId.toString(), ProfileContext.raw(profileId));
            if (ordinary == 0 && !isAdmin(userId, profileId)) deny();
        }
        if (write && !"ACTIVE".equals(states.getFirst())) {
            throw new ForbiddenException("PROFILE_READ_ONLY", "profile.readOnly", "The dataset profile is read-only");
        }
    }
    public void requireManager() { if (!canManageUsers()) deny(); }
    public void requireManagedUser(com.digiaudit.grcpc.modules.usermanagement.domain.entity.AppUserEntity user) {
        requireManager();
        if (!isRoot() && (user.isRootUser() || user.isProfileAdmin()
                || !ProfileContext.requireId().equals(user.getProfileId()))) deny();
    }
    public static void deny() { throw new ForbiddenException("PROFILE_ACCESS_DENIED", "profile.accessDenied", "Dataset access denied"); }
}
