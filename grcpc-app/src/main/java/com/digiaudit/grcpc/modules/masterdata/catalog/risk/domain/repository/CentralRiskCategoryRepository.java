package com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.entity.CentralRiskCategoryEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CentralRiskCategoryRepository extends JpaRepository<CentralRiskCategoryEntity, UUID> {
    List<CentralRiskCategoryEntity> findByStatusNotOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus status);
    List<CentralRiskCategoryEntity> findByStatusOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus status);
    List<CentralRiskCategoryEntity> findAllByOrderByIdAsc();
    Optional<CentralRiskCategoryEntity> findByIdAndStatusNot(UUID id, MasterDataLifecycleStatus status);
    boolean existsByParentCategoryIdAndStatusNot(UUID parentId, MasterDataLifecycleStatus status);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<CentralRiskCategoryEntity> findByCode(String code);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from CentralRiskCategoryEntity e where e.id = :id")
    Optional<CentralRiskCategoryEntity> lockById(@Param("id") UUID id);
}
