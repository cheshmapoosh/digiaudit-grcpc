package com.digiaudit.grcpc.modules.datasetprofile.application;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import com.digiaudit.grcpc.common.security.CurrentUserProvider;
import com.digiaudit.grcpc.modules.audit.application.AuditService;
import com.digiaudit.grcpc.modules.audit.domain.enums.*;
import com.digiaudit.grcpc.modules.datasetprofile.domain.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.constraints.*;
import java.time.LocalDateTime;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service @RequiredArgsConstructor
public class DatasetProfileService {
    private final DatasetProfileRepository profiles;
    private final CurrentUserProvider currentUser;
    private final ProfileAccessService access;
    private final AuditService audit;
    public record Save(@NotBlank @Size(max = 255) String name, @Size(max = 2000) String description,
                       @NotNull @Size(max = 32) String colorName, @NotNull @Size(max = 64) String iconName, Long version) {}
    public record View(UUID id, String name, String description, String colorName, String iconName, String status, Long version,
                       LocalDateTime createdAt, LocalDateTime updatedAt, UUID createdBy, UUID updatedBy,
                       LocalDateTime deletedAt, UUID deletedBy) {}
    @Transactional(readOnly = true)
    public List<View> list(boolean management) {
        if (management) currentUser.assertCurrentUserIsRoot();
        var actor = currentUser.getCurrentPrincipal();
        var account = currentUser.getCurrentUser();
        return profiles.findAll().stream()
                .filter(p -> management || (!"DELETED".equals(p.getStatus()) && (actor.isRootUser()
                        || p.getId().equals(account.getProfileId()) || access.isAdmin(actor.getUserId(), p.getId()))))
                .sorted(Comparator.comparing(DatasetProfileEntity::getCreatedAt).thenComparing(DatasetProfileEntity::getId))
                .map(this::view).toList();
    }
    @Transactional
    public View save(UUID id, Save request, HttpServletRequest http) {
        currentUser.assertCurrentUserIsRoot();
        var entity = id == null ? DatasetProfileEntity.builder().id(UUID.randomUUID()).status("ACTIVE").build() : find(id);
        if (id != null) { checkVersion(entity, request.version()); if ("DELETED".equals(entity.getStatus())) throw new ConflictException("Restore the profile before editing"); }
        entity.setName(request.name().trim()); entity.setDescription(request.description());
        entity.setColorName(ProfileIdentity.colorName(request.colorName()));
        entity.setIconName(ProfileIdentity.iconName(request.iconName()));
        profiles.saveAndFlush(entity);
        record(entity, id == null ? "PROFILE_CREATED" : "PROFILE_UPDATED", http);
        return view(entity);
    }
    @Transactional
    public View lifecycle(UUID id, String command, Long version, HttpServletRequest http) {
        currentUser.assertCurrentUserIsRoot();
        var entity = find(id); checkVersion(entity, version);
        switch (command) {
            case "activate" -> { require(entity, "INACTIVE"); entity.setStatus("ACTIVE"); }
            case "inactivate" -> { require(entity, "ACTIVE"); entity.setStatus("INACTIVE"); }
            case "delete" -> {
                if ("DELETED".equals(entity.getStatus())) throw new ConflictException("Profile is already deleted");
                if (profiles.findAll().stream().filter(p -> !"DELETED".equals(p.getStatus())).count() <= 1)
                    throw new ConflictException("PROFILE_LAST_REQUIRED", "profile.lastRequired", "At least one non-deleted profile must remain");
                entity.setStatus("DELETED"); entity.setDeletedAt(LocalDateTime.now()); entity.setDeletedBy(currentUser.getCurrentUserIdOrNull());
            }
            case "restore" -> { require(entity, "DELETED"); entity.setStatus("ACTIVE"); entity.setDeletedAt(null); entity.setDeletedBy(null); }
            default -> throw new ConflictException("Invalid profile lifecycle command");
        }
        profiles.flush(); record(entity, "PROFILE_" + command.toUpperCase(Locale.ROOT), http); return view(entity);
    }
    private DatasetProfileEntity find(UUID id) { return profiles.findById(id).orElseThrow(() -> new NotFoundException("Profile was not found")); }
    private void checkVersion(DatasetProfileEntity e, Long version) { if (version == null || !Objects.equals(version, e.getVersion())) throw new ConflictException("VERSION_CONFLICT", "error.masterdata.v2.versionConflict", "Profile version conflict"); }
    private void require(DatasetProfileEntity e, String status) { if (!status.equals(e.getStatus())) throw new ConflictException("Invalid profile lifecycle transition"); }
    private void record(DatasetProfileEntity e, String operation, HttpServletRequest http) {
        audit.log(AuditEventType.PROFILE_CHANGED, AuditTargetType.DATASET_PROFILE, e.getId().toString(), ActionResult.SUCCESS,
                currentUser.getCurrentUserIdOrNull(), http, Map.of("operation", operation, "profileId", e.getId().toString()));
    }
    private View view(DatasetProfileEntity e) { return new View(e.getId(), e.getName(), e.getDescription(), e.getColorName(), e.getIconName(), e.getStatus(), e.getVersion(), e.getCreatedAt(), e.getUpdatedAt(), e.getCreatedBy(), e.getUpdatedBy(), e.getDeletedAt(), e.getDeletedBy()); }
}
