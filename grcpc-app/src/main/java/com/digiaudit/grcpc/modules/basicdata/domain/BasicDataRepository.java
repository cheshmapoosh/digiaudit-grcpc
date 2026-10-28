package com.digiaudit.grcpc.modules.basicdata.domain;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface BasicDataRepository {
    List<BasicDataType> list(BasicDataKind kind, UUID profileId);
    Optional<BasicDataType> find(BasicDataKind kind, UUID profileId, UUID id);
    Optional<UUID> legacyOrganizationType(UUID profileId, String code);
    String legacyOrganizationCode(UUID profileId, UUID id);
    boolean nameExists(BasicDataKind kind, UUID profileId, String name, UUID excludingId);
    boolean referenced(BasicDataKind kind, UUID profileId, UUID id);
    void insert(BasicDataKind kind, UUID profileId, UUID id, String name, String description, UUID actor);
    boolean update(BasicDataKind kind, UUID profileId, UUID id, long version, String name, String description, String status, UUID actor);
}
