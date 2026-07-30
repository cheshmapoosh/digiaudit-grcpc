package com.digiaudit.grcpc.modules.masterdata.revision.infrastructure.security;

import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.masterdata.revision.application.MasterDataRevisionActorProvider;
import org.springframework.stereotype.Component;

import java.util.Objects;
import java.util.UUID;

@Component
public class CurrentUserMasterDataRevisionActorProvider implements MasterDataRevisionActorProvider {
    private final CurrentUserProvider currentUserProvider;

    public CurrentUserMasterDataRevisionActorProvider(CurrentUserProvider currentUserProvider) {
        this.currentUserProvider = Objects.requireNonNull(currentUserProvider, "currentUserProvider is required");
    }

    @Override
    public UUID currentActorId() {
        return currentUserProvider.getCurrentUserIdOptional()
                .orElseThrow(() -> new IllegalStateException("Authenticated actor is required for Master Data revision persistence"));
    }
}
