package com.digiaudit.grcpc.modules.masterdata.local.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.local.domain.entity.LocalOrganizationSubprocessScopeEntity;
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

public interface LocalOrganizationSubprocessScopeRepository extends JpaRepository<LocalOrganizationSubprocessScopeEntity, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from LocalOrganizationSubprocessScopeEntity e where e.id = :id")
  Optional<LocalOrganizationSubprocessScopeEntity> lockById(@Param("id") UUID id);
  Optional<LocalOrganizationSubprocessScopeEntity> findByOrganizationIdAndSubprocessId(UUID organizationId, UUID subprocessId);
  Page<LocalOrganizationSubprocessScopeEntity> findByOrganizationIdAndStatusIn(UUID organizationId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  Page<LocalOrganizationSubprocessScopeEntity> findByOrganizationIdAndSubprocessIdAndStatusIn(UUID organizationId, UUID subprocessId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  boolean existsByOrganizationIdAndStatusNot(UUID organizationId, MasterDataLifecycleStatus status);
  boolean existsBySubprocessIdAndStatusNot(UUID subprocessId, MasterDataLifecycleStatus status);
  Page<LocalOrganizationSubprocessScopeEntity> findBySubprocessIdAndStatusIn(UUID subprocessId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
}
