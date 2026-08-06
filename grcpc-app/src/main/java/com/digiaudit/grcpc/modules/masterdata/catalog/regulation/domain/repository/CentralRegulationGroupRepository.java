package com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationGroupEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CentralRegulationGroupRepository extends JpaRepository<CentralRegulationGroupEntity, UUID> {
    List<CentralRegulationGroupEntity> findByStatusNotOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus status);
    List<CentralRegulationGroupEntity> findByStatusOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus status);
    List<CentralRegulationGroupEntity> findAllByOrderByIdAsc();
    Optional<CentralRegulationGroupEntity> findByIdAndStatusNot(UUID id, MasterDataLifecycleStatus status);
    boolean existsByParentGroupIdAndStatusNot(UUID parentId, MasterDataLifecycleStatus status);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<CentralRegulationGroupEntity> findByCode(String code);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from CentralRegulationGroupEntity e where e.id = :id")
    Optional<CentralRegulationGroupEntity> lockById(@Param("id") UUID id);
}
