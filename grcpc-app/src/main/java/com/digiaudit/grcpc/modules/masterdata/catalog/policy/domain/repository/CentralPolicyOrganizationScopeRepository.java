package com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicyOrganizationScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface CentralPolicyOrganizationScopeRepository extends JpaRepository<CentralPolicyOrganizationScopeEntity, UUID> {
  List<CentralPolicyOrganizationScopeEntity> findByPolicyIdAndStatusNot(UUID policyId, MasterDataLifecycleStatus status);
  List<CentralPolicyOrganizationScopeEntity> findByPolicyIdAndStatus(UUID policyId, MasterDataLifecycleStatus status);
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from CentralPolicyOrganizationScopeEntity s where s.policyId = :policyId order by s.organizationId, s.id")
  List<CentralPolicyOrganizationScopeEntity> lockAllByPolicyId(@Param("policyId") UUID policyId);
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from CentralPolicyOrganizationScopeEntity s where s.policyId = :policyId and s.organizationId = :endpointId")
  Optional<CentralPolicyOrganizationScopeEntity> lockByBusinessKey(@Param("policyId") UUID policyId, @Param("endpointId") UUID endpointId);
}

