package com.digiaudit.grcpc.modules.masterdata.local.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.local.domain.entity.LocalPolicyRequirementScopeEntity;
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

public interface LocalPolicyRequirementScopeRepository extends JpaRepository<LocalPolicyRequirementScopeEntity, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from LocalPolicyRequirementScopeEntity e where e.id = :id")
  Optional<LocalPolicyRequirementScopeEntity> lockById(@Param("id") UUID id);
  Optional<LocalPolicyRequirementScopeEntity> findByLocalRequirementScopeIdAndPolicyId(UUID localRequirementScopeId, UUID policyId);
  Page<LocalPolicyRequirementScopeEntity> findByLocalRequirementScopeIdAndStatusIn(UUID localRequirementScopeId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  boolean existsByLocalRequirementScopeIdAndStatusNot(UUID localRequirementScopeId, MasterDataLifecycleStatus status);
  boolean existsByPolicyIdAndStatusNot(UUID policyId, MasterDataLifecycleStatus status);
  Page<LocalPolicyRequirementScopeEntity> findByPolicyIdAndStatusIn(UUID policyId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
}

