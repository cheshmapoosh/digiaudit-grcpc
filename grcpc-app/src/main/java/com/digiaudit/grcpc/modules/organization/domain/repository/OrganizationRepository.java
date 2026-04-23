package com.digiaudit.grcpc.modules.organization.domain.repository;

import com.digiaudit.grcpc.modules.organization.domain.entity.OrganizationEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface OrganizationRepository extends JpaRepository<OrganizationEntity, UUID> {

    List<OrganizationEntity> findAllByOrderByNameAsc();

    List<OrganizationEntity> findByParentIdOrderByNameAsc(UUID parentId);

    List<OrganizationEntity> findByParentIdIsNullOrderByNameAsc();

    boolean existsByParentId(UUID parentId);

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, UUID id);

    Optional<OrganizationEntity> findByCodeIgnoreCase(String code);
}
