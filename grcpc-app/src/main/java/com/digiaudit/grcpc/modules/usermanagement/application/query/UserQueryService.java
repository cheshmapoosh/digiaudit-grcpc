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
    private final com.digiaudit.grcpc.modules.datasetprofile.application.ProfileAccessService profileAccess;
    private final com.digiaudit.grcpc.modules.usermanagement.application.ProfileUserService profileUsers;

    @Transactional(readOnly = true)
    public List<UserSummaryResponse> getUsers() {
        profileAccess.requireManager();
        log.debug("Loading user list for root UI");
        return (profileAccess.isRoot() ? appUserRepository.findAll()
                : appUserRepository.findByProfileIdAndRootUserFalseAndProfileAdminFalse(com.digiaudit.grcpc.common.security.ProfileContext.requireId())).stream()
                .sorted(Comparator.comparing(AppUserEntity::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toSummary)
                .toList();
    }

    @Transactional(readOnly = true)
    public UserDetailResponse getUser(UUID userId, String locale) {
        profileAccess.requireManager();
        String normalizedLocale = localizationSupport.normalizeLocale(locale);
        AppUserEntity user = findVisibleUser(userId);
        log.debug("Loading user detail. userId={}, locale={}", userId, normalizedLocale);
        profileAccess.requireManagedUser(user);
        return toDetail(user, normalizedLocale);
    }

    @Transactional(readOnly = true)
    public List<UserRoleAssignmentResponse> getUserAssignments(UUID userId, String locale) {
        profileAccess.requireManager();
        String normalizedLocale = localizationSupport.normalizeLocale(locale);
        profileAccess.requireManagedUser(findVisibleUser(userId));
        return userRoleAssignmentRepository.findAllByUser_IdAndProfileIdOrderByAssignedAtDesc(userId, com.digiaudit.grcpc.common.security.ProfileContext.requireId()).stream()
                .map(item -> toAssignment(item, normalizedLocale))
                .toList();
    }

    private AppUserEntity findVisibleUser(UUID userId) {
        return (profileAccess.isRoot() ? appUserRepository.findById(userId)
                : appUserRepository.findByIdAndProfileId(userId, com.digiaudit.grcpc.common.security.ProfileContext.requireId()))
                .orElseThrow(() -> new NotFoundException("User was not found"));
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
                user.getCreatedAt(), user.getProfileId(), user.isProfileAdmin()
        );
    }

    private UserDetailResponse toDetail(AppUserEntity user, String locale) {
        UUID profileId = user.getProfileId() == null ? com.digiaudit.grcpc.common.security.ProfileContext.idOrNull() : user.getProfileId();
        List<UserRoleAssignmentResponse> assignments = profileId == null ? List.of()
                : userRoleAssignmentRepository.findAllByUser_IdAndProfileIdOrderByAssignedAtDesc(user.getId(), profileId)
                .stream().map(item -> toAssignment(item, locale)).toList();

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
                assignments, user.getProfileId(), user.isProfileAdmin(),
                profileAccess.isRoot() ? profileUsers.accessIds(user.getId()) : List.of()
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
                item.isActive(), item.getProfileId()
        );
    }
}
