package com.digiaudit.grcpc.modules.masterdata.objective.domain;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OrganizationObjectiveRepository extends JpaRepository<OrganizationObjectiveEntity, UUID> {
  @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @org.springframework.data.jpa.repository.Query("select e from OrganizationObjectiveEntity e where e.organizationId = :organizationId and e.objectiveId = :objectiveId")
  Optional<OrganizationObjectiveEntity> lockPair(
      @org.springframework.data.repository.query.Param("organizationId") UUID organizationId,
      @org.springframework.data.repository.query.Param("objectiveId") UUID objectiveId);
  List<OrganizationObjectiveEntity> findByOrganizationIdAndStatusOrderByNameAsc(UUID organizationId, MasterDataLifecycleStatus status);
  List<OrganizationObjectiveEntity> findByObjectiveIdAndStatusOrderByNameAsc(UUID objectiveId, MasterDataLifecycleStatus status);
  List<OrganizationObjectiveEntity> findByOrganizationIdAndStatusNotOrderByNameAsc(
      UUID organizationId, MasterDataLifecycleStatus status);
  List<OrganizationObjectiveEntity> findByObjectiveIdAndStatusNotOrderByNameAsc(
      UUID objectiveId, MasterDataLifecycleStatus status);
  Optional<OrganizationObjectiveEntity> findByOrganizationIdAndObjectiveId(
      UUID organizationId, UUID objectiveId);
  boolean existsByObjectiveIdAndStatusNot(UUID objectiveId, MasterDataLifecycleStatus status);
}
