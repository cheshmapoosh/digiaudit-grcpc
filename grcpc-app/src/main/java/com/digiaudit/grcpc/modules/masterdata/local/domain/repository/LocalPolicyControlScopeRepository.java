package com.digiaudit.grcpc.modules.masterdata.local.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.local.domain.entity.LocalPolicyControlScopeEntity;
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

public interface LocalPolicyControlScopeRepository extends JpaRepository<LocalPolicyControlScopeEntity, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from LocalPolicyControlScopeEntity e where e.id = :id")
  Optional<LocalPolicyControlScopeEntity> lockById(@Param("id") UUID id);
  Optional<LocalPolicyControlScopeEntity> findByLocalControlScopeIdAndPolicyId(UUID localControlScopeId, UUID policyId);
  Page<LocalPolicyControlScopeEntity> findByLocalControlScopeIdAndStatusIn(UUID localControlScopeId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  boolean existsByLocalControlScopeIdAndStatusNot(UUID localControlScopeId, MasterDataLifecycleStatus status);
  boolean existsByPolicyIdAndStatusNot(UUID policyId, MasterDataLifecycleStatus status);
  Page<LocalPolicyControlScopeEntity> findByPolicyIdAndStatusIn(UUID policyId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
}

