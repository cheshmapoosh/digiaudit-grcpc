package com.digiaudit.grcpc.modules.masterdata.objective.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ObjectiveRepository extends JpaRepository<ObjectiveEntity, UUID> {
  @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
  @org.springframework.data.jpa.repository.Query("select e from ObjectiveEntity e where e.id = :id")
  Optional<ObjectiveEntity> lockById(@org.springframework.data.repository.query.Param("id") UUID id);
  Optional<ObjectiveEntity> findByCode(String code);
  List<ObjectiveEntity> findAllByOrderByTitleAscIdAsc();
  boolean existsByParentObjectiveIdAndStatusNot(UUID parentId,
      com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus status);
}
