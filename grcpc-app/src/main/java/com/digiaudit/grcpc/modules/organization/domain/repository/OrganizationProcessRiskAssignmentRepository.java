package com.digiaudit.grcpc.modules.organization.domain.repository;

import com.digiaudit.grcpc.modules.organization.domain.entity.OrganizationProcessRiskAssignmentEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationProcessRiskAssignmentRepository
        extends JpaRepository<OrganizationProcessRiskAssignmentEntity, UUID> {

    List<OrganizationProcessRiskAssignmentEntity> findByOrganizationIdOrderByCreatedAtAsc(UUID organizationId);

    List<OrganizationProcessRiskAssignmentEntity> findByOrganizationIdAndProcessNodeIdInOrderByCreatedAtAsc(
            UUID organizationId,
            List<UUID> processNodeIds
    );

    Optional<OrganizationProcessRiskAssignmentEntity> findByOrganizationIdAndProcessNodeIdAndRiskNodeId(
            UUID organizationId,
            UUID processNodeId,
            UUID riskNodeId
    );

    long deleteByOrganizationIdAndProcessNodeId(UUID organizationId, UUID processNodeId);
}
