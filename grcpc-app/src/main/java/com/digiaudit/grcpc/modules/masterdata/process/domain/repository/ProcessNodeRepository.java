package com.digiaudit.grcpc.modules.masterdata.process.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.process.domain.entity.ProcessNodeEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProcessNodeRepository extends JpaRepository<ProcessNodeEntity, UUID> {

    List<ProcessNodeEntity> findAllByOrderBySortOrderAscTitleAsc();

    List<ProcessNodeEntity> findByParentIdOrderBySortOrderAscTitleAsc(UUID parentId);

    List<ProcessNodeEntity> findByParentIdIsNullOrderBySortOrderAscTitleAsc();

    boolean existsByParentId(UUID parentId);

    boolean existsByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCaseAndIdNot(String code, UUID id);

    Optional<ProcessNodeEntity> findByCodeIgnoreCase(String code);
}
