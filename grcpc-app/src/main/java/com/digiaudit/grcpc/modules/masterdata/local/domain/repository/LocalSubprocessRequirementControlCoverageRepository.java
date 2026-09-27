package com.digiaudit.grcpc.modules.masterdata.local.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.local.domain.entity.LocalSubprocessRequirementControlCoverageEntity;
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

public interface LocalSubprocessRequirementControlCoverageRepository extends JpaRepository<LocalSubprocessRequirementControlCoverageEntity, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from LocalSubprocessRequirementControlCoverageEntity e where e.id = :id")
  Optional<LocalSubprocessRequirementControlCoverageEntity> lockById(@Param("id") UUID id);
  Optional<LocalSubprocessRequirementControlCoverageEntity> findByOrganizationSubprocessScopeIdAndLocalRequirementScopeIdAndLocalControlScopeId(UUID organizationSubprocessScopeId, UUID localRequirementScopeId, UUID localControlScopeId);
  Page<LocalSubprocessRequirementControlCoverageEntity> findByOrganizationSubprocessScopeIdAndStatusIn(UUID organizationSubprocessScopeId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  boolean existsByOrganizationSubprocessScopeIdAndStatusNot(UUID organizationSubprocessScopeId, MasterDataLifecycleStatus status);
  boolean existsByLocalRequirementScopeIdAndStatusNot(UUID localRequirementScopeId, MasterDataLifecycleStatus status);
  Page<LocalSubprocessRequirementControlCoverageEntity> findByLocalRequirementScopeIdAndStatusIn(UUID localRequirementScopeId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  boolean existsByLocalControlScopeIdAndStatusNot(UUID localControlScopeId, MasterDataLifecycleStatus status);
  Page<LocalSubprocessRequirementControlCoverageEntity> findByLocalControlScopeIdAndStatusIn(UUID localControlScopeId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  boolean existsByCentralRequirementControlCoverageIdAndStatusNot(UUID centralRequirementControlCoverageId, MasterDataLifecycleStatus status);
  Page<LocalSubprocessRequirementControlCoverageEntity> findByCentralRequirementControlCoverageIdAndStatusIn(UUID centralRequirementControlCoverageId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
}

