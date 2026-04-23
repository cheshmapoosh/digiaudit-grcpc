package com.digiaudit.grcpc.modules.usermanagement.domain.repository;

import com.digiaudit.grcpc.modules.usermanagement.domain.entity.AppUserEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AppUserRepository extends JpaRepository<AppUserEntity, UUID> {

    Optional<AppUserEntity> findByUsername(String username);

    boolean existsByUsername(String username);

    boolean existsByRootUserTrue();

    @Query("""
            select distinct r.code
            from UserRoleAssignmentEntity ura
            join ura.role r
            where ura.user.id = :userId
              and ura.active = true
              and r.enabled = true
              and (ura.validFrom is null or ura.validFrom <= CURRENT_TIMESTAMP)
              and (ura.validTo is null or ura.validTo >= CURRENT_TIMESTAMP)
            """)
    List<String> findActiveRoleCodes(@Param("userId") UUID userId);

    @Query("""
            select distinct p.code
            from UserRoleAssignmentEntity ura
            join ura.role r
            join RolePermissionEntity rp on rp.role = r
            join rp.permission p
            where ura.user.id = :userId
              and ura.active = true
              and r.enabled = true
              and (ura.validFrom is null or ura.validFrom <= CURRENT_TIMESTAMP)
              and (ura.validTo is null or ura.validTo >= CURRENT_TIMESTAMP)
            """)
    List<String> findActivePermissionCodes(@Param("userId") UUID userId);

    @Query("""
            select distinct bp.code
            from UserRoleAssignmentEntity ura
            join ura.role r
            join RoleBusinessPermissionEntity rbp on rbp.role = r
            join rbp.businessPermission bp
            where ura.user.id = :userId
              and ura.active = true
              and r.enabled = true
              and (ura.validFrom is null or ura.validFrom <= CURRENT_TIMESTAMP)
              and (ura.validTo is null or ura.validTo >= CURRENT_TIMESTAMP)
            """)
    List<String> findActiveBusinessPermissionCodes(@Param("userId") UUID userId);
}