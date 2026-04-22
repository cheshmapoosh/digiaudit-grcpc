package com.digiaudit.grcpc.modules.usermanagement.domain.repository;

import com.digiaudit.grcpc.modules.usermanagement.domain.entity.RoleEntity;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RoleRepository extends JpaRepository<RoleEntity, UUID> {

    Optional<RoleEntity> findByCode(String code);

    boolean existsByCode(String code);

    List<RoleEntity> findAllByIdIn(Collection<UUID> ids);

    @Override
    @EntityGraph(attributePaths = {"translations"})
    List<RoleEntity> findAll();

    @Override
    @EntityGraph(attributePaths = {"translations"})
    Optional<RoleEntity> findById(UUID uuid);
}
