package com.digiaudit.grcpc.common.security;

import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.AuditorAware;
import org.springframework.lang.NonNullApi;
import org.springframework.stereotype.Component;

import java.util.Optional;
import java.util.UUID;

@Component("auditorAware")
@RequiredArgsConstructor
public class SecurityAuditorAware implements AuditorAware<UUID> {

    private final CurrentUserProvider currentUserProvider;

    @Override
    public  Optional<UUID> getCurrentAuditor() {
        return currentUserProvider.getCurrentUserIdOptional();
    }
}