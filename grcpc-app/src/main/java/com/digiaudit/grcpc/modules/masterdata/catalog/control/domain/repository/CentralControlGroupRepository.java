package com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CentralControlGroupRepository extends JpaRepository<CentralControlGroupEntity, UUID> {
  List<CentralControlGroupEntity> findByStatusNotOrderBySortOrderAscTitleAscIdAsc(
      MasterDataLifecycleStatus status);

  List<CentralControlGroupEntity> findByStatusOrderBySortOrderAscTitleAscIdAsc(
      MasterDataLifecycleStatus status);

  List<CentralControlGroupEntity> findAllByOrderByIdAsc();

  Optional<CentralControlGroupEntity> findByIdAndStatusNot(UUID id, MasterDataLifecycleStatus status);

  boolean existsByParentGroupIdAndStatusNot(UUID id, MasterDataLifecycleStatus status);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  Optional<CentralControlGroupEntity> findByCode(String code);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from CentralControlGroupEntity e where e.id = :id")
  Optional<CentralControlGroupEntity> lockById(@Param("id") UUID id);
}
