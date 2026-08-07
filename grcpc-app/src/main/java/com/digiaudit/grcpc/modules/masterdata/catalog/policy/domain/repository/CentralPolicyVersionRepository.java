package com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.PolicyVersionStatus;
import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicyVersionEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CentralPolicyVersionRepository
    extends JpaRepository<CentralPolicyVersionEntity, UUID> {
  List<CentralPolicyVersionEntity> findByPolicyIdAndStatusNotOrderByVersionNumberDesc(
      UUID policyId, MasterDataLifecycleStatus status);

  List<CentralPolicyVersionEntity> findByPolicyIdAndStatusOrderByVersionNumberDesc(
      UUID policyId, MasterDataLifecycleStatus status);

  Optional<CentralPolicyVersionEntity> findByIdAndStatusNot(
      UUID id, MasterDataLifecycleStatus status);

  Optional<CentralPolicyVersionEntity> findByPolicyIdAndVersionStatus(
      UUID policyId, PolicyVersionStatus status);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from CentralPolicyVersionEntity e where e.policyId = :policyId order by e.id")
  List<CentralPolicyVersionEntity> lockAllByPolicyId(@Param("policyId") UUID policyId);
}
