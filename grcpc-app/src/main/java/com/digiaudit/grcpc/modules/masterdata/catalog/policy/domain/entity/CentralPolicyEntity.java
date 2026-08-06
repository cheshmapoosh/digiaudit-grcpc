package com.digiaudit.grcpc.modules.masterdata.catalog.policy.domain.entity;

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
@Table(name = "central_policy")
public class CentralPolicyEntity extends CentralDefinitionEntity {
    @JdbcTypeCode(SqlTypes.BINARY)
    @Column(name = "policy_group_id", nullable = false, columnDefinition = "RAW(16)")
    private UUID policyGroupId;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected CentralPolicyEntity() {
    }

    private CentralPolicyEntity(UUID id, String code, String title, UUID policyGroupId,
                                String description, int sortOrder, LocalDate validFrom, LocalDate validTo,
                                UUID actorId, Instant now) {
        super(id, code, title, description, validFrom, validTo, actorId, now);
        this.policyGroupId = policyGroupId;
        this.sortOrder = sortOrder;
    }

    public static CentralPolicyEntity create(UUID id, String code, String title, UUID policyGroupId,
                                              String description, int sortOrder, LocalDate validFrom,
                                              LocalDate validTo, UUID actorId, Instant now) {
        return new CentralPolicyEntity(id, code, title, policyGroupId, description, sortOrder,
                validFrom, validTo, actorId, now);
    }

    public void update(String title, String description, LocalDate validFrom, LocalDate validTo,
                       UUID actorId, Instant now) {
        updateDefinition(title, description, validFrom, validTo, actorId, now);
    }

    public void move(UUID policyGroupId, int sortOrder, UUID actorId, Instant now) {
        requireNotDeleted();
        this.policyGroupId = policyGroupId;
        this.sortOrder = sortOrder;
        touch(actorId, now);
    }

    public void restoreFromCreate(String title, UUID policyGroupId, String description, int sortOrder,
                                  LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) {
        this.policyGroupId = policyGroupId;
        this.sortOrder = sortOrder;
        restoreDefinition(title, description, validFrom, validTo, actorId, now);
    }

    public void reactivateFromCreate(String title, UUID policyGroupId, String description, int sortOrder,
                                     LocalDate validFrom, LocalDate validTo, UUID actorId, Instant now) {
        this.policyGroupId = policyGroupId;
        this.sortOrder = sortOrder;
        reactivateDefinition(title, description, validFrom, validTo, actorId, now);
    }

    public UUID getPolicyGroupId() { return policyGroupId; }
    public int getSortOrder() { return sortOrder; }
}
