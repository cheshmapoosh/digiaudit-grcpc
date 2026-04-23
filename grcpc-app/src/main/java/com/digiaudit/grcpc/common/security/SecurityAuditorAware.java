package com.digiaudit.grcpc.common.security;

import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.AuditorAware;
import org.springframework.stereotype.Component;

@Component("auditorAware")
@RequiredArgsConstructor
public class SecurityAuditorAware implements AuditorAware<UUID> {

    private final CurrentUserProvider currentUserProvider;

    @Override
    public Optional<UUID> getCurrentAuditor() {
        return currentUserProvider.getCurrentUserIdOptional();
    }
}