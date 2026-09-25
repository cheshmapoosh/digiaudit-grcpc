package com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicyRequirementScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface CentralPolicyRequirementScopeRepository extends JpaRepository<CentralPolicyRequirementScopeEntity, UUID> {
  List<CentralPolicyRequirementScopeEntity> findByPolicyIdAndStatusNot(UUID policyId, MasterDataLifecycleStatus status);
  List<CentralPolicyRequirementScopeEntity> findByPolicyIdAndStatus(UUID policyId, MasterDataLifecycleStatus status);
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from CentralPolicyRequirementScopeEntity s where s.policyId = :policyId order by s.centralRequirementScopeId, s.id")
  List<CentralPolicyRequirementScopeEntity> lockAllByPolicyId(@Param("policyId") UUID policyId);
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from CentralPolicyRequirementScopeEntity s where s.policyId = :policyId and s.centralRequirementScopeId = :endpointId")
  Optional<CentralPolicyRequirementScopeEntity> lockByBusinessKey(@Param("policyId") UUID policyId, @Param("endpointId") UUID endpointId);
}

