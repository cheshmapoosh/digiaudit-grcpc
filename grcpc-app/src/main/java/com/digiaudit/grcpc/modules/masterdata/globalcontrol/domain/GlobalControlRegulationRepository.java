package com.digiaudit.grcpc.modules.masterdata.globalcontrol.domain;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GlobalControlRegulationRepository
    extends JpaRepository<GlobalControlRegulationEntity, UUID> {
  List<GlobalControlRegulationEntity> findByGlobalControlIdAndStatusNot(
      UUID globalControlId, MasterDataLifecycleStatus status);
  Optional<GlobalControlRegulationEntity> findByGlobalControlIdAndRegulationId(
      UUID globalControlId, UUID regulationId);
  boolean existsByGlobalControlIdAndStatusNot(
      UUID globalControlId, MasterDataLifecycleStatus status);
  boolean existsByRegulationIdAndStatusNot(
      UUID regulationId, MasterDataLifecycleStatus status);
}
