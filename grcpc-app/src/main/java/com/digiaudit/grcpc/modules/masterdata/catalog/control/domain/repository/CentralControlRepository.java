package com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity.CentralControlEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CentralControlRepository extends JpaRepository<CentralControlEntity, UUID> {
  List<CentralControlEntity> findByStatusNotOrderByTitleAscIdAsc(MasterDataLifecycleStatus status);

  List<CentralControlEntity> findByStatusOrderByTitleAscIdAsc(MasterDataLifecycleStatus status);

  Optional<CentralControlEntity> findByIdAndStatusNot(UUID id, MasterDataLifecycleStatus status);

  boolean existsByControlGroupIdAndStatusNot(UUID controlGroupId, MasterDataLifecycleStatus status);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  Optional<CentralControlEntity> findByCode(String code);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from CentralControlEntity e where e.id = :id")
  Optional<CentralControlEntity> lockById(@Param("id") UUID id);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from CentralControlEntity e where e.id in :ids order by e.id")
  List<CentralControlEntity> lockAllByIds(@Param("ids") List<UUID> ids);
}
