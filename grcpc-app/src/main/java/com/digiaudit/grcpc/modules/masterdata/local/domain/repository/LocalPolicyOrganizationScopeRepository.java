package com.digiaudit.grcpc.modules.masterdata.local.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.local.domain.entity.LocalPolicyOrganizationScopeEntity;
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

public interface LocalPolicyOrganizationScopeRepository extends JpaRepository<LocalPolicyOrganizationScopeEntity, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from LocalPolicyOrganizationScopeEntity e where e.id = :id")
  Optional<LocalPolicyOrganizationScopeEntity> lockById(@Param("id") UUID id);
  Optional<LocalPolicyOrganizationScopeEntity> findByOrganizationIdAndPolicyId(UUID organizationId, UUID policyId);
  Page<LocalPolicyOrganizationScopeEntity> findByOrganizationIdAndStatusIn(UUID organizationId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
  boolean existsByOrganizationIdAndStatusNot(UUID organizationId, MasterDataLifecycleStatus status);
  boolean existsByPolicyIdAndStatusNot(UUID policyId, MasterDataLifecycleStatus status);
  Page<LocalPolicyOrganizationScopeEntity> findByPolicyIdAndStatusIn(UUID policyId, List<MasterDataLifecycleStatus> statuses, Pageable pageable);
}

