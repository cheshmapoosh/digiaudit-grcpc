package com.digiaudit.grcpc.modules.masterdata.local.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.local.domain.entity.LocalSubprocessRequirementScopeEntity;
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

public interface LocalSubprocessRequirementScopeRepository extends JpaRepository<LocalSubprocessRequirementScopeEntity, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from LocalSubprocessRequirementScopeEntity e where e.id = :id")
  Optional<LocalSubprocessRequirementScopeEntity> lockById(@Param("id") UUID id);
  Optional<LocalSubprocessRequirementScopeEntity> findByOrganizationSubprocessScopeIdAndRequirementId(UUID organizationSubprocessScopeId, UUID requirementId);
  Page<LocalSubprocessRequirementScopeEntity> findByOrganizationSubprocessScopeIdAndStatusIn(UUID organizationSubprocessScopeId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  boolean existsByOrganizationSubprocessScopeIdAndStatusNot(UUID organizationSubprocessScopeId, MasterDataLifecycleStatus status);
  boolean existsByRequirementIdAndStatusNot(UUID requirementId, MasterDataLifecycleStatus status);
  Page<LocalSubprocessRequirementScopeEntity> findByRequirementIdAndStatusIn(UUID requirementId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  boolean existsByCentralRequirementScopeIdAndStatusNot(UUID centralRequirementScopeId, MasterDataLifecycleStatus status);
  Page<LocalSubprocessRequirementScopeEntity> findByCentralRequirementScopeIdAndStatusIn(UUID centralRequirementScopeId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
}

