package com.digiaudit.grcpc.modules.organization.domain.repository;

import com.digiaudit.grcpc.modules.organization.domain.entity.OrganizationProcessAssignmentEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationProcessAssignmentRepository extends JpaRepository<OrganizationProcessAssignmentEntity, UUID> {

    List<OrganizationProcessAssignmentEntity> findByOrganizationIdOrderByCreatedAtAsc(UUID organizationId);

    List<OrganizationProcessAssignmentEntity> findByOrganizationIdAndActiveTrueOrderByCreatedAtAsc(UUID organizationId);

    Optional<OrganizationProcessAssignmentEntity> findByOrganizationIdAndProcessNodeId(UUID organizationId, UUID processNodeId);
}
