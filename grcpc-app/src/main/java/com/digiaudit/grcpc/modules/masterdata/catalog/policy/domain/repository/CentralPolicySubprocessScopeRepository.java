package com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicySubprocessScopeEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface CentralPolicySubprocessScopeRepository extends JpaRepository<CentralPolicySubprocessScopeEntity, UUID> {
  List<CentralPolicySubprocessScopeEntity> findByPolicyIdAndStatusNot(UUID policyId, MasterDataLifecycleStatus status);
  List<CentralPolicySubprocessScopeEntity> findByPolicyIdAndStatus(UUID policyId, MasterDataLifecycleStatus status);
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from CentralPolicySubprocessScopeEntity s where s.policyId = :policyId order by s.subprocessId, s.id")
  List<CentralPolicySubprocessScopeEntity> lockAllByPolicyId(@Param("policyId") UUID policyId);
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select s from CentralPolicySubprocessScopeEntity s where s.policyId = :policyId and s.subprocessId = :endpointId")
  Optional<CentralPolicySubprocessScopeEntity> lockByBusinessKey(@Param("policyId") UUID policyId, @Param("endpointId") UUID endpointId);
}

