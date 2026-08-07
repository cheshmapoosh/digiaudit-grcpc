package com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.catalog.accountgroup.domain.entity.CentralAccountGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CentralAccountGroupRepository
    extends JpaRepository<CentralAccountGroupEntity, UUID> {
  List<CentralAccountGroupEntity> findByStatusNotOrderBySortOrderAscTitleAscIdAsc(
      MasterDataLifecycleStatus status);

  List<CentralAccountGroupEntity> findByStatusOrderBySortOrderAscTitleAscIdAsc(
      MasterDataLifecycleStatus status);

  List<CentralAccountGroupEntity> findAllByOrderByIdAsc();

  Optional<CentralAccountGroupEntity> findByIdAndStatusNot(
      UUID id, MasterDataLifecycleStatus status);

  boolean existsByParentAccountGroupIdAndStatusNot(UUID parentId, MasterDataLifecycleStatus status);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  Optional<CentralAccountGroupEntity> findByCode(String code);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from CentralAccountGroupEntity e where e.id = :id")
  Optional<CentralAccountGroupEntity> lockById(@Param("id") UUID id);
}
