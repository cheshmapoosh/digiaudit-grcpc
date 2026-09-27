package com.digiaudit.grcpc.modules.masterdata.local.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.local.domain.entity.LocalSubprocessRiskControlObjectiveCoverageEntity;
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

public interface LocalSubprocessRiskControlObjectiveCoverageRepository extends JpaRepository<LocalSubprocessRiskControlObjectiveCoverageEntity, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from LocalSubprocessRiskControlObjectiveCoverageEntity e where e.id = :id")
  Optional<LocalSubprocessRiskControlObjectiveCoverageEntity> lockById(@Param("id") UUID id);
  Optional<LocalSubprocessRiskControlObjectiveCoverageEntity> findByOrganizationSubprocessScopeIdAndLocalRiskScopeIdAndLocalControlObjectiveScopeId(UUID organizationSubprocessScopeId, UUID localRiskScopeId, UUID localControlObjectiveScopeId);
  Page<LocalSubprocessRiskControlObjectiveCoverageEntity> findByOrganizationSubprocessScopeIdAndStatusIn(UUID organizationSubprocessScopeId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  boolean existsByOrganizationSubprocessScopeIdAndStatusNot(UUID organizationSubprocessScopeId, MasterDataLifecycleStatus status);
  boolean existsByLocalRiskScopeIdAndStatusNot(UUID localRiskScopeId, MasterDataLifecycleStatus status);
  Page<LocalSubprocessRiskControlObjectiveCoverageEntity> findByLocalRiskScopeIdAndStatusIn(UUID localRiskScopeId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  boolean existsByLocalControlObjectiveScopeIdAndStatusNot(UUID localControlObjectiveScopeId, MasterDataLifecycleStatus status);
  Page<LocalSubprocessRiskControlObjectiveCoverageEntity> findByLocalControlObjectiveScopeIdAndStatusIn(UUID localControlObjectiveScopeId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  boolean existsByCentralRiskControlObjectiveCoverageIdAndStatusNot(UUID centralRiskControlObjectiveCoverageId, MasterDataLifecycleStatus status);
  Page<LocalSubprocessRiskControlObjectiveCoverageEntity> findByCentralRiskControlObjectiveCoverageIdAndStatusIn(UUID centralRiskControlObjectiveCoverageId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
}

