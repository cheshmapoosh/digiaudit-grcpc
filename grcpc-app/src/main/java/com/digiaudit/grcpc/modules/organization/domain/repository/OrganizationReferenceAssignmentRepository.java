package com.digiaudit.grcpc.modules.organization.domain.repository;

import com.digiaudit.grcpc.modules.organization.domain.entity.OrganizationReferenceAssignmentEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationReferenceAssignmentRepository
        extends JpaRepository<OrganizationReferenceAssignmentEntity, UUID> {

    List<OrganizationReferenceAssignmentEntity> findByOrganizationIdAndReferenceTypeOrderByCreatedAtAsc(
            UUID organizationId,
            String referenceType
    );

    Optional<OrganizationReferenceAssignmentEntity> findByOrganizationIdAndReferenceTypeAndReferenceId(
            UUID organizationId,
            String referenceType,
            UUID referenceId
    );
}
