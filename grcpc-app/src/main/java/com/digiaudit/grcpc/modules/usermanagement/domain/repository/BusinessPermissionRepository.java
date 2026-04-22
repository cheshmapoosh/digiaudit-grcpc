package com.digiaudit.grcpc.modules.usermanagement.domain.repository;

import com.digiaudit.grcpc.modules.usermanagement.domain.entity.BusinessPermissionEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.UUID;

public interface BusinessPermissionRepository extends JpaRepository<BusinessPermissionEntity, UUID> {

    List<BusinessPermissionEntity> findAllByCodeIn(Collection<String> codes);

    @Override
    @EntityGraph(attributePaths = {"translations"})
    List<BusinessPermissionEntity> findAll();
}
