package com.digiaudit.grcpc.modules.usermanagement.domain.repository;

import com.digiaudit.grcpc.modules.usermanagement.domain.entity.RoleEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.RolePermissionEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface RolePermissionRepository extends JpaRepository<RolePermissionEntity, UUID> {

    void deleteAllByRole(RoleEntity role);

    @EntityGraph(attributePaths = {"permission", "permission.translations"})
    List<RolePermissionEntity> findAllByRole(RoleEntity role);
}
