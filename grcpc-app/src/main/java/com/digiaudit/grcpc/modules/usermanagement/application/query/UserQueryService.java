package com.digiaudit.grcpc.modules.usermanagement.application.query;

import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.response.UserDetailResponse;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.response.UserRoleAssignmentResponse;
import com.digiaudit.grcpc.modules.usermanagement.api.dto.response.UserSummaryResponse;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.AppUserEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.UserRoleAssignmentEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.AppUserRepository;
import com.digiaudit.grcpc.modules.usermanagement.domain.repository.UserRoleAssignmentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserQueryService {

    private final AppUserRepository appUserRepository;
    private final UserRoleAssignmentRepository userRoleAssignmentRepository;
    private final CurrentUserProvider currentUserProvider;
    private final LocalizationSupport localizationSupport;

    @Transactional(readOnly = true)
    public List<UserSummaryResponse> getUsers() {
        currentUserProvider.assertCurrentUserIsRoot();
        log.debug("Loading user list for root UI");
        return appUserRepository.findAll().stream()
                .sorted(Comparator.comparing(AppUserEntity::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserDetailResponse getUser(UUID userId, String locale) {
        currentUserProvider.assertCurrentUserIsRoot();
        String normalizedLocale = localizationSupport.normalizeLocale(locale);
        AppUserEntity user = appUserRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("User was not found"));
        log.debug("Loading user detail. userId={}, locale={}", userId, normalizedLocale);
        return toDetail(user, normalizedLocale);
    }

    @Transactional(readOnly = true)
    public List<UserRoleAssignmentResponse> getUserAssignments(UUID userId, String locale) {
        currentUserProvider.assertCurrentUserIsRoot();
        String normalizedLocale = localizationSupport.normalizeLocale(locale);
        if (!appUserRepository.existsById(userId)) {
            throw new NotFoundException("User was not found");
        }
        return userRoleAssignmentRepository.findAllByUser_IdOrderByAssignedAtDesc(userId).stream()
                .map(item -> toAssignment(item, normalizedLocale))
                .toList();
    }

    private UserSummaryResponse toSummary(AppUserEntity user) {
        return new UserSummaryResponse(
                user.getId(),
                user.getUsername(),
                user.getFirstName(),
                user.getLastName(),
                user.getMobile(),
                user.getEmail(),
                user.isEnabled(),
                user.isLocked(),
                user.isRootUser(),
                user.getDefaultOrgUnitId(),
                user.getCreatedAt()
        );
    }

    private UserDetailResponse toDetail(AppUserEntity user, String locale) {
        List<UserRoleAssignmentResponse> assignments = userRoleAssignmentRepository.findAllByUser_IdOrderByAssignedAtDesc(user.getId())
                .stream()
                .map(item -> toAssignment(item, locale))
                .toList();

        return new UserDetailResponse(
                user.getId(),
                user.getUsername(),
                user.getFirstName(),
                user.getLastName(),
                user.getMobile(),
                user.getEmail(),
                user.isEnabled(),
                user.isLocked(),
                user.isRootUser(),
                user.getDefaultOrgUnitId(),
                user.getLastLoginAt(),
                user.getCreatedAt(),
                user.getUpdatedAt(),
                assignments
        );
    }

    private UserRoleAssignmentResponse toAssignment(UserRoleAssignmentEntity item, String locale) {
        String roleTitle = localizationSupport.resolveRoleText(item.getRole().getTranslations(), locale)
                .map(text -> text.title())
                .orElse(item.getRole().getCode());

        return new UserRoleAssignmentResponse(
                item.getId(),
                item.getRole().getId(),
                item.getRole().getCode(),
                roleTitle,
                item.getScopeType(),
                item.getScopeOrgUnitId(),
                item.getValidFrom(),
                item.getValidTo(),
                item.getAssignedBy(),
                item.getAssignedAt(),
                item.isActive()
        );
    }
}
