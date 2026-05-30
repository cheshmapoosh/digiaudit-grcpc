package com.digiaudit.grcpc.modules.securityacl.domain.repository;

import com.digiaudit.grcpc.modules.securityacl.domain.entity.ResourceAclEntryEntity;
import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ResourceAclEntryRepository extends JpaRepository<ResourceAclEntryEntity, UUID> {

    List<ResourceAclEntryEntity> findByTargetTypeAndTargetId(String targetType, UUID targetId);

    List<ResourceAclEntryEntity> findByTargetTypeAndTargetIdAndSubjectTypeAndSubjectIdIn(
            String targetType,
            UUID targetId,
            String subjectType,
            Collection<UUID> subjectIds
    );

    Optional<ResourceAclEntryEntity> findByTargetTypeAndTargetIdAndSubjectTypeAndSubjectIdAndPermissionCode(
            String targetType,
            UUID targetId,
            String subjectType,
            UUID subjectId,
            String permissionCode
    );
}
