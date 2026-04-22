package com.digiaudit.grcpc.modules.usermanagement.domain.repository;

import com.digiaudit.grcpc.modules.usermanagement.domain.entity.DelegationAssignableRoleEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.DelegationPolicyEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface DelegationAssignableRoleRepository extends JpaRepository<DelegationAssignableRoleEntity, UUID> {

    @EntityGraph(attributePaths = {"assignableRole", "assignableRole.translations"})
    List<DelegationAssignableRoleEntity> findAllByDelegationPolicy(DelegationPolicyEntity delegationPolicy);

    void deleteAllByDelegationPolicy(DelegationPolicyEntity delegationPolicy);
}
