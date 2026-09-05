package com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationRequirementEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CentralRegulationRequirementRepository
    extends JpaRepository<CentralRegulationRequirementEntity, UUID> {
  List<CentralRegulationRequirementEntity> findByStatusNotOrderBySortOrderAscTitleAscIdAsc(
      MasterDataLifecycleStatus status);

  List<CentralRegulationRequirementEntity> findByStatusOrderBySortOrderAscTitleAscIdAsc(
      MasterDataLifecycleStatus status);

  List<CentralRegulationRequirementEntity>
      findByRegulationIdAndStatusNotOrderBySortOrderAscTitleAscIdAsc(
          UUID regulationId, MasterDataLifecycleStatus status);

  Optional<CentralRegulationRequirementEntity> findByIdAndStatusNot(
      UUID id, MasterDataLifecycleStatus status);

  boolean existsByRegulationIdAndStatusNot(UUID regulationId, MasterDataLifecycleStatus status);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  Optional<CentralRegulationRequirementEntity> findByCode(String code);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from CentralRegulationRequirementEntity e where e.id = :id")
  Optional<CentralRegulationRequirementEntity> lockById(@Param("id") UUID id);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from CentralRegulationRequirementEntity e where e.id in :ids order by e.id")
  List<CentralRegulationRequirementEntity> lockAllByIds(@Param("ids") List<UUID> ids);
}
