package com.digiaudit.grcpc.modules.masterdata.local.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.local.domain.entity.LocalSubprocessControlObjectiveScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LocalSubprocessControlObjectiveScopeRepository extends JpaRepository<LocalSubprocessControlObjectiveScopeEntity, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from LocalSubprocessControlObjectiveScopeEntity e where e.id = :id")
  Optional<LocalSubprocessControlObjectiveScopeEntity> lockById(@Param("id") UUID id);
  Optional<LocalSubprocessControlObjectiveScopeEntity> findByOrganizationSubprocessScopeIdAndControlObjectiveId(UUID organizationSubprocessScopeId, UUID controlObjectiveId);
  Page<LocalSubprocessControlObjectiveScopeEntity> findByOrganizationSubprocessScopeIdAndStatusIn(UUID organizationSubprocessScopeId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  boolean existsByOrganizationSubprocessScopeIdAndStatusNot(UUID organizationSubprocessScopeId, MasterDataLifecycleStatus status);
  boolean existsByControlObjectiveIdAndStatusNot(UUID controlObjectiveId, MasterDataLifecycleStatus status);
  Page<LocalSubprocessControlObjectiveScopeEntity> findByControlObjectiveIdAndStatusIn(UUID controlObjectiveId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  boolean existsByCentralControlObjectiveScopeIdAndStatusNot(UUID centralControlObjectiveScopeId, MasterDataLifecycleStatus status);
  Page<LocalSubprocessControlObjectiveScopeEntity> findByCentralControlObjectiveScopeIdAndStatusIn(UUID centralControlObjectiveScopeId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
}

