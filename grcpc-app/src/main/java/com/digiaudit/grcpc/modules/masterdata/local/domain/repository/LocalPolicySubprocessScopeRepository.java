package com.digiaudit.grcpc.modules.masterdata.local.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.local.domain.entity.LocalPolicySubprocessScopeEntity;
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

public interface LocalPolicySubprocessScopeRepository extends JpaRepository<LocalPolicySubprocessScopeEntity, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from LocalPolicySubprocessScopeEntity e where e.id = :id")
  Optional<LocalPolicySubprocessScopeEntity> lockById(@Param("id") UUID id);
  Optional<LocalPolicySubprocessScopeEntity> findByOrganizationSubprocessScopeIdAndPolicyId(UUID organizationSubprocessScopeId, UUID policyId);
  Page<LocalPolicySubprocessScopeEntity> findByOrganizationSubprocessScopeIdAndStatusIn(UUID organizationSubprocessScopeId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  boolean existsByOrganizationSubprocessScopeIdAndStatusNot(UUID organizationSubprocessScopeId, MasterDataLifecycleStatus status);
  boolean existsByPolicyIdAndStatusNot(UUID policyId, MasterDataLifecycleStatus status);
  Page<LocalPolicySubprocessScopeEntity> findByPolicyIdAndStatusIn(UUID policyId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
}

