package com.digiaudit.grcpc.modules.securityacl.application;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.ProfileContext;
import com.digiaudit.grcpc.modules.datasetprofile.application.ProfileAccessService;
import com.digiaudit.grcpc.modules.document.domain.DocumentLinkTargetType;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.AppUserRepository;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.RoleRepository;
import java.util.Locale;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

/** Validates existing ACL references; does not add resource types or business relations. */
@Component @RequiredArgsConstructor
public class ProfileAclBoundary {
    private final org.springframework.jdbc.core.JdbcTemplate jdbc;
    private final AppUserRepository users;
    private final RoleRepository roles;
    private final ProfileAccessService access;

    public void target(String code, UUID id) {
        ProfileContext.requireId();
        String normalized = code.trim().toUpperCase(Locale.ROOT);
        DocumentLinkTargetType type;
        try { type = DocumentLinkTargetType.fromPublicWireValue(normalized); }
        catch (IllegalArgumentException e) {
            try { type = DocumentLinkTargetType.valueOf(normalized); }
            catch (IllegalArgumentException unknown) { throw new NotFoundException("ACL target is not an active typed resource"); }
        }
        if (!type.isPublicSelectable()) throw new NotFoundException("ACL target is not an active typed resource");
        // SQL identifiers come exclusively from the closed enum; both values are bound parameters.
        String table = type.name().toLowerCase(Locale.ROOT);
        Long count = jdbc.queryForObject("select count(*) from " + table
                        + " where profile_id = ? and id = ? and status <> 'DELETED'", Long.class,
                ProfileContext.raw(ProfileContext.requireId()), ProfileContext.raw(id));
        if (count == null || count == 0) throw new NotFoundException("ACL target was not found in this profile");
    }

    public void subject(String type, UUID id) {
        if ("ROLE".equalsIgnoreCase(type)) {
            if (!roles.existsById(id)) throw new NotFoundException("Role was not found");
            return;
        }
        if (!"USER".equalsIgnoreCase(type)) ProfileAccessService.deny();
        var user = users.findById(id).orElseThrow(() -> new NotFoundException("ACL subject was not found"));
        if (!user.isRootUser() && !ProfileContext.requireId().equals(user.getProfileId())
                && !access.isAdmin(id, ProfileContext.requireId())) ProfileAccessService.deny();
    }
}
