package com.digiaudit.grcpc.common.persistence;

import com.digiaudit.grcpc.common.security.ProfileContext;
import com.digiaudit.grcpc.common.exception.ForbiddenException;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreRemove;
import jakarta.persistence.PreUpdate;

public class ProfileEntityListener {
    @PrePersist
    public void create(ProfileScoped entity) {
        if (entity.getProfileId() == null) entity.setProfileId(ProfileContext.requireId());
        validate(entity);
    }
    @PreUpdate @PreRemove
    public void validate(ProfileScoped entity) {
        com.digiaudit.grcpc.modules.datasetprofile.application.ProfileTransactionPolicy.requireProtectedMutation();
        if (!ProfileContext.requireId().equals(entity.getProfileId())) {
            throw new ForbiddenException("PROFILE_ACCESS_DENIED", "profile.accessDenied", "Dataset profile mismatch");
        }
    }
}
