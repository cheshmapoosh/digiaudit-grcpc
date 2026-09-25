package com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicyControlScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface CentralPolicyControlScopeRepository extends JpaRepository<CentralPolicyControlScopeEntity, UUID> {
  List<CentralPolicyControlScopeEntity> findByPolicyIdAndStatusNot(UUID policyId, MasterDataLifecycleStatus status);
  List<CentralPolicyControlScopeEntity> findByPolicyIdAndStatus(UUID policyId, MasterDataLifecycleStatus status);
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from CentralPolicyControlScopeEntity s where s.policyId = :policyId order by s.centralControlScopeId, s.id")
  List<CentralPolicyControlScopeEntity> lockAllByPolicyId(@Param("policyId") UUID policyId);
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from CentralPolicyControlScopeEntity s where s.policyId = :policyId and s.centralControlScopeId = :endpointId")
  Optional<CentralPolicyControlScopeEntity> lockByBusinessKey(@Param("policyId") UUID policyId, @Param("endpointId") UUID endpointId);
}

