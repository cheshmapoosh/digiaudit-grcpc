package com.digiaudit.grcpc.modules.usermanagement.domain.repository;

import com.digiaudit.grcpc.modules.usermanagement.domain.entity.RoleBusinessPermissionEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.RoleEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RoleBusinessPermissionRepository extends JpaRepository<RoleBusinessPermissionEntity, UUID> {

    void deleteAllByRole(RoleEntity role);

    @EntityGraph(attributePaths = {"businessPermission", "businessPermission.translations"})
    List<RoleBusinessPermissionEntity> findAllByRole(RoleEntity role);
}
