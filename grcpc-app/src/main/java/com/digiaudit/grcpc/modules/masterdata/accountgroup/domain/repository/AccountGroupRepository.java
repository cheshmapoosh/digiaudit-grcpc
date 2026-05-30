package com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.repository;

import com.digiaudit.grcpc.modules.masterdata.accountgroup.domain.entity.AccountGroupEntity;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AccountGroupRepository extends JpaRepository<AccountGroupEntity, UUID> {
    List<AccountGroupEntity> findAllByOrderBySortOrderAscTitleAsc();
    List<AccountGroupEntity> findByParentIdOrderBySortOrderAscTitleAsc(UUID parentId);
    List<AccountGroupEntity> findByParentIdIsNullOrderBySortOrderAscTitleAsc();
    boolean existsByParentId(UUID parentId);
    boolean existsByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCaseAndIdNot(String code, UUID id);
    Optional<AccountGroupEntity> findByCodeIgnoreCase(String code);
}
