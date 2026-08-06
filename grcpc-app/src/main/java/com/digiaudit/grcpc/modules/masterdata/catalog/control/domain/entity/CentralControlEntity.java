package com.digiaudit.grcpc.modules.masterdata.catalog.control.domain.entity;

import com.digiaudit.grcpc.modules.masterdata.catalog.shared.domain.entity.CentralDefinitionEntity;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "central_control")
public class CentralControlEntity extends CentralDefinitionEntity {
    protected CentralControlEntity() {
    }

    private CentralControlEntity(UUID id, String code, String title, String description,
                                 LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) {
        super(id, code, title, description, validFrom, validTo, actorId, now);
    }

    public static CentralControlEntity create(UUID id, String code, String title, String description,
                                               LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) {
        return new CentralControlEntity(id, code, title, description, validFrom, validTo, actorId, now);
    }

    public void update(String title, String description, LocalDate validFrom, LocalDate validTo,
                       UUID actorId, Instant now) {
        updateDefinition(title, description, validFrom, validTo, actorId, now);
    }

    public void restoreFromCreate(String title, String description, LocalDate validFrom, LocalDate validTo,
                                  UUID actorId, Instant now) {
        restoreDefinition(title, description, validFrom, validTo, actorId, now);
    }

    public void reactivateFromCreate(String title, String description, LocalDate validFrom, LocalDate validTo,
                                     UUID actorId, Instant now) {
        reactivateDefinition(title, description, validFrom, validTo, actorId, now);
    }
}
