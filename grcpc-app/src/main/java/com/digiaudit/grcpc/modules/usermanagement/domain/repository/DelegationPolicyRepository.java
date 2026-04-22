package com.digiaudit.grcpc.modules.usermanagement.domain.repository;

import com.digiaudit.grcpc.modules.usermanagement.domain.entity.DelegationPolicyEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DelegationPolicyRepository extends JpaRepository<DelegationPolicyEntity, UUID> {

    @Override
    @EntityGraph(attributePaths = {"subjectRole", "subjectRole.translations", "subjectUser"})
    List<DelegationPolicyEntity> findAll();

    @Override
    @EntityGraph(attributePaths = {"subjectRole", "subjectRole.translations", "subjectUser"})
    java.util.Optional<DelegationPolicyEntity> findById(UUID uuid);
}
