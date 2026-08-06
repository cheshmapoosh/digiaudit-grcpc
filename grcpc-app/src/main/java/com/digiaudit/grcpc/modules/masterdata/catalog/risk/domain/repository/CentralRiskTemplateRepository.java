package com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.catalog.risk.domain.entity.CentralRiskTemplateEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CentralRiskTemplateRepository extends JpaRepository<CentralRiskTemplateEntity, UUID> {
    List<CentralRiskTemplateEntity> findByStatusNotOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus status);
    List<CentralRiskTemplateEntity> findByStatusOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus status);
    List<CentralRiskTemplateEntity> findByRiskCategoryIdAndStatusNotOrderBySortOrderAscTitleAscIdAsc(UUID categoryId, MasterDataLifecycleStatus status);
    Optional<CentralRiskTemplateEntity> findByIdAndStatusNot(UUID id, MasterDataLifecycleStatus status);
    boolean existsByRiskCategoryIdAndStatusNot(UUID categoryId, MasterDataLifecycleStatus status);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<CentralRiskTemplateEntity> findByCode(String code);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from CentralRiskTemplateEntity e where e.id = :id")
    Optional<CentralRiskTemplateEntity> lockById(@Param("id") UUID id);
}
