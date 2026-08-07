package com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicyEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CentralPolicyRepository extends JpaRepository<CentralPolicyEntity, UUID> {
  List<CentralPolicyEntity> findByStatusNotOrderBySortOrderAscTitleAscIdAsc(
      MasterDataLifecycleStatus status);

  List<CentralPolicyEntity> findByStatusOrderBySortOrderAscTitleAscIdAsc(
      MasterDataLifecycleStatus status);

  List<CentralPolicyEntity> findByPolicyGroupIdAndStatusNotOrderBySortOrderAscTitleAscIdAsc(
      UUID groupId, MasterDataLifecycleStatus status);

  Optional<CentralPolicyEntity> findByIdAndStatusNot(UUID id, MasterDataLifecycleStatus status);

  boolean existsByPolicyGroupIdAndStatusNot(UUID groupId, MasterDataLifecycleStatus status);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  Optional<CentralPolicyEntity> findByCode(String code);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("select e from CentralPolicyEntity e where e.id = :id")
  Optional<CentralPolicyEntity> lockById(@Param("id") UUID id);

  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      """
      select policy
        from CentralPolicyEntity policy
       where policy.id = (
             select version.policyId
               from CentralPolicyVersionEntity version
              where version.id = :versionId
       )
      """)
  Optional<CentralPolicyEntity> lockByVersionId(@Param("versionId") UUID versionId);
}
