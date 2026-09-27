package com.digiaudit.grcpc.modules.masterdata.globalcontrol.domain;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ControlGroupRepository extends JpaRepository<ControlGroupEntity, UUID> {
  List<ControlGroupEntity> findAllByOrderByTitleAscIdAsc();
  Optional<ControlGroupEntity> findByCode(String code);
  boolean existsByParentIdAndStatusNot(UUID parentId, MasterDataLifecycleStatus status);
}
