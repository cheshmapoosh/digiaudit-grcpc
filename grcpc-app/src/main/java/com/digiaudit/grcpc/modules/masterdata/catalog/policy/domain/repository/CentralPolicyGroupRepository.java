package com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity.CentralPolicyGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CentralPolicyGroupRepository extends JpaRepository<CentralPolicyGroupEntity, UUID> {
    List<CentralPolicyGroupEntity> findByStatusNotOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus status);
    List<CentralPolicyGroupEntity> findByStatusOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus status);
    List<CentralPolicyGroupEntity> findAllByOrderByIdAsc();
    Optional<CentralPolicyGroupEntity> findByIdAndStatusNot(UUID id, MasterDataLifecycleStatus status);
    boolean existsByParentGroupIdAndStatusNot(UUID parentId, MasterDataLifecycleStatus status);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<CentralPolicyGroupEntity> findByCode(String code);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from CentralPolicyGroupEntity e where e.id = :id")
    Optional<CentralPolicyGroupEntity> lockById(@Param("id") UUID id);
}
