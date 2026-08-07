package com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.catalog.controlobjective.domain.entity.CentralControlObjectiveEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CentralControlObjectiveRepository
    extends JpaRepository<CentralControlObjectiveEntity, UUID> {
  List<CentralControlObjectiveEntity> findByStatusNotOrderByTitleAscIdAsc(
      MasterDataLifecycleStatus status);

  List<CentralControlObjectiveEntity> findByStatusOrderByTitleAscIdAsc(
      MasterDataLifecycleStatus status);

  Optional<CentralControlObjectiveEntity> findByIdAndStatusNot(
      UUID id, MasterDataLifecycleStatus status);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  Optional<CentralControlObjectiveEntity> findByCode(String code);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from CentralControlObjectiveEntity e where e.id = :id")
  Optional<CentralControlObjectiveEntity> lockById(@Param("id") UUID id);
}
