package com.digiaudit.grcpc.modules.masterdata.local.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.local.domain.entity.LocalSubprocessRiskControlCoverageEntity;
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

public interface LocalSubprocessRiskControlCoverageRepository extends JpaRepository<LocalSubprocessRiskControlCoverageEntity, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from LocalSubprocessRiskControlCoverageEntity e where e.id = :id")
  Optional<LocalSubprocessRiskControlCoverageEntity> lockById(@Param("id") UUID id);
  Optional<LocalSubprocessRiskControlCoverageEntity> findByOrganizationSubprocessScopeIdAndLocalRiskScopeIdAndLocalControlScopeId(UUID organizationSubprocessScopeId, UUID localRiskScopeId, UUID localControlScopeId);
  Page<LocalSubprocessRiskControlCoverageEntity> findByOrganizationSubprocessScopeIdAndStatusIn(UUID organizationSubprocessScopeId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  boolean existsByOrganizationSubprocessScopeIdAndStatusNot(UUID organizationSubprocessScopeId, MasterDataLifecycleStatus status);
  boolean existsByLocalRiskScopeIdAndStatusNot(UUID localRiskScopeId, MasterDataLifecycleStatus status);
  Page<LocalSubprocessRiskControlCoverageEntity> findByLocalRiskScopeIdAndStatusIn(UUID localRiskScopeId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  boolean existsByLocalControlScopeIdAndStatusNot(UUID localControlScopeId, MasterDataLifecycleStatus status);
  Page<LocalSubprocessRiskControlCoverageEntity> findByLocalControlScopeIdAndStatusIn(UUID localControlScopeId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  boolean existsByCentralRiskControlCoverageIdAndStatusNot(UUID centralRiskControlCoverageId, MasterDataLifecycleStatus status);
  Page<LocalSubprocessRiskControlCoverageEntity> findByCentralRiskControlCoverageIdAndStatusIn(UUID centralRiskControlCoverageId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
}

