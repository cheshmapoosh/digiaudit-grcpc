package com.digiaudit.grcpc.modules.masterdata.local.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.local.domain.entity.LocalSubprocessControlScopeEntity;
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

public interface LocalSubprocessControlScopeRepository extends JpaRepository<LocalSubprocessControlScopeEntity, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from LocalSubprocessControlScopeEntity e where e.id = :id")
  Optional<LocalSubprocessControlScopeEntity> lockById(@Param("id") UUID id);
  Optional<LocalSubprocessControlScopeEntity> findByOrganizationSubprocessScopeIdAndControlId(UUID organizationSubprocessScopeId, UUID controlId);
  Page<LocalSubprocessControlScopeEntity> findByOrganizationSubprocessScopeIdAndStatusIn(UUID organizationSubprocessScopeId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  boolean existsByOrganizationSubprocessScopeIdAndStatusNot(UUID organizationSubprocessScopeId, MasterDataLifecycleStatus status);
  boolean existsByControlIdAndStatusNot(UUID controlId, MasterDataLifecycleStatus status);
  Page<LocalSubprocessControlScopeEntity> findByControlIdAndStatusIn(UUID controlId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  boolean existsByCentralControlScopeIdAndStatusNot(UUID centralControlScopeId, MasterDataLifecycleStatus status);
  Page<LocalSubprocessControlScopeEntity> findByCentralControlScopeIdAndStatusIn(UUID centralControlScopeId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  boolean existsByActualOwnerIdAndStatusNot(UUID actualOwnerId, MasterDataLifecycleStatus status);
  Page<LocalSubprocessControlScopeEntity> findByActualOwnerIdAndStatusIn(UUID actualOwnerId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
}

