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
@Table(name = "central_regulation")
public class CentralRegulationEntity extends CentralDefinitionEntity {
    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "regulation_group_id", nullable = false, columnDefinition = "RAW(16)")
    private UUID regulationGroupId;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected CentralRegulationEntity() {
    }

    private CentralRegulationEntity(UUID id, String code, String title, UUID regulationGroupId,
                                    String description, int sortOrder, LocalDate validFrom, LocalDate validTo,
                                    UUID actorId, Instant now) {
        super(id, code, title, description, validFrom, validTo, actorId, now);
        this.regulationGroupId = regulationGroupId;
        this.sortOrder = sortOrder;
    }

    public static CentralRegulationEntity create(UUID id, String code, String title, UUID regulationGroupId,
                                                  String description, int sortOrder, LocalDate validFrom,
                                                  LocalDate validTo, UUID actorId, Instant now) {
        return new CentralRegulationEntity(id, code, title, regulationGroupId, description, sortOrder,
                validFrom, validTo, actorId, now);
    }

    public void update(String title, String description, LocalDate validFrom, LocalDate validTo,
                       UUID actorId, Instant now) {
        updateDefinition(title, description, validFrom, validTo, actorId, now);
    }

    public void move(UUID regulationGroupId, int sortOrder, UUID actorId, Instant now) {
        requireNotDeleted();
        this.regulationGroupId = regulationGroupId;
        this.sortOrder = sortOrder;
        touch(actorId, now);
    }

    public void restoreFromCreate(String title, UUID regulationGroupId, String description, int sortOrder,
                                  LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) {
        this.regulationGroupId = regulationGroupId;
        this.sortOrder = sortOrder;
        restoreDefinition(title, description, validFrom, validTo, actorId, now);
    }

    public void reactivateFromCreate(String title, UUID regulationGroupId, String description, int sortOrder,
                                     LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) {
        this.regulationGroupId = regulationGroupId;
        this.sortOrder = sortOrder;
        reactivateDefinition(title, description, validFrom, validTo, actorId, now);
    }

    public UUID getRegulationGroupId() { return regulationGroupId; }
    public int getSortOrder() { return sortOrder; }
}
