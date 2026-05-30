package com.digiaudit.grcpc.modules.masterdata.objective.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.objective.domain.entity.ObjectiveNodeEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ObjectiveNodeRepository extends JpaRepository<ObjectiveNodeEntity, UUID> {
    List<ObjectiveNodeEntity> findAllByOrderBySortOrderAscTitleAsc();
    List<ObjectiveNodeEntity> findByParentIdOrderBySortOrderAscTitleAsc(UUID parentId);
    List<ObjectiveNodeEntity> findByParentIdIsNullOrderBySortOrderAscTitleAsc();
    boolean existsByParentId(UUID parentId);
    boolean existsByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCaseAndIdNot(String code, UUID id);
    Optional<ObjectiveNodeEntity> findByCodeIgnoreCase(String code);
}
