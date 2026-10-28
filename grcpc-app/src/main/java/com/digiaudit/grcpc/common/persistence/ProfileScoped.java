package com.digiaudit.grcpc.common.persistence;

import java.util.UUID;

public interface ProfileScoped {
    UUID getProfileId();
    void setProfileId(UUID profileId);
}
