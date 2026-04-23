package com.digiaudit.grcpc.common.security;

import com.digiaudit.grcpc.common.exception.ForbiddenException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.AppUserEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.AppUserRepository;
import java.util.Optional;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class CurrentUserProvider {

    private final AppUserRepository appUserRepository;

    public Optional<CurrentUser> getCurrentPrincipalOptional() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null
                || !authentication.isAuthenticated()
                || authentication instanceof AnonymousAuthenticationToken) {
            return Optional.empty();
        }

        Object principal = authentication.getPrincipal();
        if (principal instanceof CurrentUser currentUser) {
            return Optional.of(currentUser);
        }

        return Optional.empty();
    }

    public CurrentUser getCurrentPrincipal() {
        return getCurrentPrincipalOptional()
                .orElseThrow(() -> new NotFoundException("Authenticated principal was not found"));
    }

    public Optional<UUID> getCurrentUserIdOptional() {
        return getCurrentPrincipalOptional().map(CurrentUser::getUserId);
    }

    public UUID getCurrentUserIdOrNull() {
        return getCurrentUserIdOptional().orElse(null);
    }

    public Optional<AppUserEntity> getCurrentUserOptional() {
        return getCurrentUserIdOptional().flatMap(appUserRepository::findById);
    }

    public AppUserEntity getCurrentUser() {
        return getCurrentUserOptional()
                .orElseThrow(() -> new NotFoundException("Authenticated user was not found"));
    }

    public void assertCurrentUserIsRoot() {
        CurrentUser currentUser = getCurrentPrincipal();

        if (!currentUser.isRootUser()) {
            log.warn("Access denied for non-root user. username={}, userId={}", currentUser.getUsername(), currentUser.getUserId());
            throw new ForbiddenException("Only root user can perform this operation in version 1");
        }
    }
}