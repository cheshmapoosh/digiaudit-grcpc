package com.digiaudit.grcpc.modules.masterdata.globalcontrol.domain;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GlobalControlRegulationRepository
    extends JpaRepository<GlobalControlRegulationEntity, UUID> {
  @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @org.springframework.data.jpa.repository.Query("select e from GlobalControlRegulationEntity e where e.globalControlId = :controlId and e.regulationId = :regulationId")
  Optional<GlobalControlRegulationEntity> lockPair(
      @org.springframework.data.repository.query.Param("controlId") UUID controlId,
      @org.springframework.data.repository.query.Param("regulationId") UUID regulationId);
  List<GlobalControlRegulationEntity> findByGlobalControlIdAndStatus(UUID controlId, MasterDataLifecycleStatus status);
  List<GlobalControlRegulationEntity> findByGlobalControlIdAndStatusNot(
      UUID globalControlId, MasterDataLifecycleStatus status);
  Optional<GlobalControlRegulationEntity> findByGlobalControlIdAndRegulationId(
      UUID globalControlId, UUID regulationId);
  boolean existsByGlobalControlIdAndStatusNot(
      UUID globalControlId, MasterDataLifecycleStatus status);
  boolean existsByRegulationIdAndStatusNot(
      UUID regulationId, MasterDataLifecycleStatus status);
}
