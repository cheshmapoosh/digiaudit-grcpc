package com.digiaudit.grcpc.modules.usermanagement.domain.repository;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.AppUserEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppUserRepository extends JpaRepository<AppUserEntity, UUID> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from AppUserEntity u where u.id = :id")
    Optional<AppUserEntity> findByIdForUpdate(@Param("id") UUID id);

    Optional<AppUserEntity> findByUsername(String username);

    List<AppUserEntity> findByProfileIdAndRootUserFalseAndProfileAdminFalse(UUID profileId);

    Optional<AppUserEntity> findByIdAndProfileId(UUID id, UUID profileId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select u from AppUserEntity u where u.id = :id and u.profileId = :profileId and u.rootUser = false and u.profileAdmin = false")
    Optional<AppUserEntity> findOrdinaryByIdForUpdate(@Param("id") UUID id, @Param("profileId") UUID profileId);

    boolean existsByUsername(String username);

    boolean existsByRootUserTrue();

    @Query("""
            select distinct r.code
            from UserRoleAssignmentEntity ura
            join ura.role r
            where ura.user.id = :userId
              and ura.profileId = :profileId
              and ura.active = true
              and ura.scopeType = com.digiaudit.grcpc.modules.usermanagement.domain.enums.ScopeType.GLOBAL
              and ura.scopeOrgUnitId is null
              and r.enabled = true
              and (ura.validFrom is null or ura.validFrom <= CURRENT_TIMESTAMP)
              and (ura.validTo is null or ura.validTo >= CURRENT_TIMESTAMP)
            """)
    List<String> findActiveRoleCodes(@Param("userId") UUID userId, @Param("profileId") UUID profileId);

    @Query("""
            select distinct r.id
            from UserRoleAssignmentEntity ura
            join ura.role r
            where ura.user.id = :userId
              and ura.profileId = :profileId
              and ura.active = true
              and ura.scopeType = com.digiaudit.grcpc.modules.usermanagement.domain.enums.ScopeType.GLOBAL
              and ura.scopeOrgUnitId is null
              and r.enabled = true
              and (ura.validFrom is null or ura.validFrom <= CURRENT_TIMESTAMP)
              and (ura.validTo is null or ura.validTo >= CURRENT_TIMESTAMP)
            """)
    List<UUID> findActiveRoleIds(@Param("userId") UUID userId, @Param("profileId") UUID profileId);

    @Query("""
            select distinct p.code
            from UserRoleAssignmentEntity ura
            join ura.role r
            join RolePermissionEntity rp on rp.role = r
            join rp.permission p
            where ura.user.id = :userId
              and ura.profileId = :profileId
              and ura.active = true
              and ura.scopeType = com.digiaudit.grcpc.modules.usermanagement.domain.enums.ScopeType.GLOBAL
              and ura.scopeOrgUnitId is null
              and r.enabled = true
              and (ura.validFrom is null or ura.validFrom <= CURRENT_TIMESTAMP)
              and (ura.validTo is null or ura.validTo >= CURRENT_TIMESTAMP)
            """)
    List<String> findActivePermissionCodes(@Param("userId") UUID userId, @Param("profileId") UUID profileId);

    @Query("""
            select distinct bp.code
            from UserRoleAssignmentEntity ura
            join ura.role r
            join RoleBusinessPermissionEntity rbp on rbp.role = r
            join rbp.businessPermission bp
            where ura.user.id = :userId
              and ura.profileId = :profileId
              and ura.active = true
              and ura.scopeType = com.digiaudit.grcpc.modules.usermanagement.domain.enums.ScopeType.GLOBAL
              and ura.scopeOrgUnitId is null
              and r.enabled = true
              and (ura.validFrom is null or ura.validFrom <= CURRENT_TIMESTAMP)
              and (ura.validTo is null or ura.validTo >= CURRENT_TIMESTAMP)
            """)
    List<String> findActiveBusinessPermissionCodes(@Param("userId") UUID userId, @Param("profileId") UUID profileId);
    default List<String> findActiveRoleCodes(UUID userId) {
        UUID profileId = com.digiaudit.grcpc.common.security.ProfileContext.idOrNull();
        return profileId == null ? List.of() : findActiveRoleCodes(userId, profileId);
    }
    default List<UUID> findActiveRoleIds(UUID userId) {
        UUID profileId = com.digiaudit.grcpc.common.security.ProfileContext.idOrNull();
        return profileId == null ? List.of() : findActiveRoleIds(userId, profileId);
    }
    default List<String> findActivePermissionCodes(UUID userId) {
        UUID profileId = com.digiaudit.grcpc.common.security.ProfileContext.idOrNull();
        return profileId == null ? List.of() : findActivePermissionCodes(userId, profileId);
    }
    default List<String> findActiveBusinessPermissionCodes(UUID userId) {
        UUID profileId = com.digiaudit.grcpc.common.security.ProfileContext.idOrNull();
        return profileId == null ? List.of() : findActiveBusinessPermissionCodes(userId, profileId);
    }
}
