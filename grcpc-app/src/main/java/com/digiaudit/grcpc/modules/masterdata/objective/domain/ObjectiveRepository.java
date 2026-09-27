package com.digiaudit.grcpc.modules.masterdata.objective.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ObjectiveRepository extends JpaRepository<ObjectiveEntity, UUID> {
  Optional<ObjectiveEntity> findByCode(String code);
  List<ObjectiveEntity> findAllByOrderByTitleAscIdAsc();
  boolean existsByParentObjectiveIdAndStatusNot(UUID parentId,
      com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus status);
}
