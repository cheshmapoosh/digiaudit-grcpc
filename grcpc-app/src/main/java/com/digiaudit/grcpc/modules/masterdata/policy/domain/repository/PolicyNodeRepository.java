package com.digiaudit.grcpc.modules.masterdata.policy.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.policy.domain.entity.PolicyNodeEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PolicyNodeRepository extends JpaRepository<PolicyNodeEntity, UUID> {
    List<PolicyNodeEntity> findAllByOrderBySortOrderAscTitleAsc();
    List<PolicyNodeEntity> findByParentIdOrderBySortOrderAscTitleAsc(UUID parentId);
    List<PolicyNodeEntity> findByParentIdIsNullOrderBySortOrderAscTitleAsc();
    List<PolicyNodeEntity> findByNodeTypeOrderBySortOrderAscTitleAsc(String nodeType);
    boolean existsByParentId(UUID parentId);
    boolean existsByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCaseAndIdNot(String code, UUID id);
    Optional<PolicyNodeEntity> findByCodeIgnoreCase(String code);
}
