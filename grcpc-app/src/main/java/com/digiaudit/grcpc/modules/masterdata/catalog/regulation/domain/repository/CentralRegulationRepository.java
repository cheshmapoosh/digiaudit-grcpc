package com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity.CentralRegulationEntity;
import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CentralRegulationRepository extends JpaRepository<CentralRegulationEntity, UUID> {
    List<CentralRegulationEntity> findByStatusNotOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus status);
    List<CentralRegulationEntity> findByStatusOrderBySortOrderAscTitleAscIdAsc(MasterDataLifecycleStatus status);
    List<CentralRegulationEntity> findByRegulationGroupIdAndStatusNotOrderBySortOrderAscTitleAscIdAsc(UUID groupId, MasterDataLifecycleStatus status);
    Optional<CentralRegulationEntity> findByIdAndStatusNot(UUID id, MasterDataLifecycleStatus status);
    boolean existsByRegulationGroupIdAndStatusNot(UUID groupId, MasterDataLifecycleStatus status);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<CentralRegulationEntity> findByCode(String code);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from CentralRegulationEntity e where e.id = :id")
    Optional<CentralRegulationEntity> lockById(@Param("id") UUID id);
}
