package com.digiaudit.grcpc.modules.masterdata.catalog.regulation.domain.entity;

import com.digiaudit.grcpc.modules.masterdata.catalog.shared.domain.entity.CentralDefinitionEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "central_regulation_requirement")
public class CentralRegulationRequirementEntity extends CentralDefinitionEntity {
    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "regulation_id", nullable = false, columnDefinition = "RAW(16)")
    private UUID regulationId;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected CentralRegulationRequirementEntity() {
    }

    private CentralRegulationRequirementEntity(UUID id, String code, String title, UUID regulationId,
                                               String description, int sortOrder, LocalDate validFrom,
                                               LocalDate validTo, UUID actorId, Instant now) {
        super(id, code, title, description, validFrom, validTo, actorId, now);
        this.regulationId = regulationId;
        this.sortOrder = sortOrder;
    }

    public static CentralRegulationRequirementEntity create(UUID id, String code, String title, UUID regulationId,
                                                             String description, int sortOrder, LocalDate validFrom,
                                                             LocalDate validTo, UUID actorId, Instant now) {
        return new CentralRegulationRequirementEntity(id, code, title, regulationId, description, sortOrder,
                validFrom, validTo, actorId, now);
    }

    public void update(String title, String description, LocalDate validFrom, LocalDate validTo,
                       UUID actorId, Instant now) {
        updateDefinition(title, description, validFrom, validTo, actorId, now);
    }

    public void move(UUID regulationId, int sortOrder, UUID actorId, Instant now) {
        requireNotDeleted();
        this.regulationId = regulationId;
        this.sortOrder = sortOrder;
        touch(actorId, now);
    }

    public void restoreFromCreate(String title, UUID regulationId, String description, int sortOrder,
                                  LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) {
        this.regulationId = regulationId;
        this.sortOrder = sortOrder;
        restoreDefinition(title, description, validFrom, validTo, actorId, now);
    }

    public void reactivateFromCreate(String title, UUID regulationId, String description, int sortOrder,
                                     LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) {
        this.regulationId = regulationId;
        this.sortOrder = sortOrder;
        reactivateDefinition(title, description, validFrom, validTo, actorId, now);
    }

    public UUID getRegulationId() { return regulationId; }
    public int getSortOrder() { return sortOrder; }
}
