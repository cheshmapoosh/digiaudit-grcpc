package com.digiaudit.grcpc.modules.usermanagement.domain.repository;

import com.digiaudit.grcpc.modules.usermanagement.domain.entity.UserRoleAssignmentEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.enums.ScopeType;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface UserRoleAssignmentRepository extends JpaRepository<UserRoleAssignmentEntity, UUID> {

    boolean existsByUser_IdAndRole_IdAndScopeTypeAndScopeOrgUnitIdAndActiveTrue(
            UUID userId,
            UUID roleId,
            ScopeType scopeType,
            UUID scopeOrgUnitId
    );

    @EntityGraph(attributePaths = {"role", "role.translations"})
    List<UserRoleAssignmentEntity> findAllByUser_IdOrderByAssignedAtDesc(UUID userId);
}
