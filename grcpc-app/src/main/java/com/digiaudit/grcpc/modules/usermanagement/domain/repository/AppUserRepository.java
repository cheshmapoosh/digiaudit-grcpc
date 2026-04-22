package com.digiaudit.grcpc.modules.usermanagement.domain.repository;

import com.digiaudit.grcpc.modules.usermanagement.domain.entity.AppUserEntity;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface AppUserRepository extends JpaRepository<AppUserEntity, UUID> {

    Optional<AppUserEntity> findByUsername(String username);

    boolean existsByUsername(String username);

    boolean existsByRootUserTrue();

    @Query(value = """
            select r.code
            from user_role_assignment ura
            join role r on r.id = ura.role_id
            where ura.user_id = :userId
              and ura.active = true
              and r.enabled = true
            """, nativeQuery = true)
    List<String> findRoleCodes(@Param("userId") UUID userId);

    @Query(value = """
            select distinct p.code
            from user_role_assignment ura
            join role r on r.id = ura.role_id and r.enabled = true
            join role_permission rp on rp.role_id = r.id
            join permission p on p.id = rp.permission_id
            where ura.user_id = :userId
              and ura.active = true
            """, nativeQuery = true)
    List<String> findPermissionCodes(@Param("userId") UUID userId);
}
