package com.digiaudit.grcpc.modules.masterdata.objective.domain;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationObjectiveRepository extends JpaRepository<OrganizationObjectiveEntity, UUID> {
  List<OrganizationObjectiveEntity> findByOrganizationIdAndStatusNotOrderByNameAsc(
      UUID organizationId, MasterDataLifecycleStatus status);
  List<OrganizationObjectiveEntity> findByObjectiveIdAndStatusNotOrderByNameAsc(
      UUID objectiveId, MasterDataLifecycleStatus status);
  Optional<OrganizationObjectiveEntity> findByOrganizationIdAndObjectiveId(
      UUID organizationId, UUID objectiveId);
  boolean existsByObjectiveIdAndStatusNot(UUID objectiveId, MasterDataLifecycleStatus status);
}
