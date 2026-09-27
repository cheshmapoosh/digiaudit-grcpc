package com.digiaudit.grcpc.modules.masterdata.local.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.local.domain.entity.LocalSubprocessControlControlObjectiveCoverageEntity;
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

public interface LocalSubprocessControlControlObjectiveCoverageRepository extends JpaRepository<LocalSubprocessControlControlObjectiveCoverageEntity, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from LocalSubprocessControlControlObjectiveCoverageEntity e where e.id = :id")
  Optional<LocalSubprocessControlControlObjectiveCoverageEntity> lockById(@Param("id") UUID id);
  Optional<LocalSubprocessControlControlObjectiveCoverageEntity> findByOrganizationSubprocessScopeIdAndLocalControlScopeIdAndLocalControlObjectiveScopeId(UUID organizationSubprocessScopeId, UUID localControlScopeId, UUID localControlObjectiveScopeId);
  Page<LocalSubprocessControlControlObjectiveCoverageEntity> findByOrganizationSubprocessScopeIdAndStatusIn(UUID organizationSubprocessScopeId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  boolean existsByOrganizationSubprocessScopeIdAndStatusNot(UUID organizationSubprocessScopeId, MasterDataLifecycleStatus status);
  boolean existsByLocalControlScopeIdAndStatusNot(UUID localControlScopeId, MasterDataLifecycleStatus status);
  Page<LocalSubprocessControlControlObjectiveCoverageEntity> findByLocalControlScopeIdAndStatusIn(UUID localControlScopeId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  boolean existsByLocalControlObjectiveScopeIdAndStatusNot(UUID localControlObjectiveScopeId, MasterDataLifecycleStatus status);
  Page<LocalSubprocessControlControlObjectiveCoverageEntity> findByLocalControlObjectiveScopeIdAndStatusIn(UUID localControlObjectiveScopeId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  boolean existsByCentralControlControlObjectiveCoverageIdAndStatusNot(UUID centralControlControlObjectiveCoverageId, MasterDataLifecycleStatus status);
  Page<LocalSubprocessControlControlObjectiveCoverageEntity> findByCentralControlControlObjectiveCoverageIdAndStatusIn(UUID centralControlControlObjectiveCoverageId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
}

