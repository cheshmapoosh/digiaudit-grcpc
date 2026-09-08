package com.digiaudit.grcpc.modules.masterdata.classification.controlaccountgroup.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

public record CentralControlAccountGroupResponse(
    UUID classificationId,
    UUID controlId, String controlCode, String controlTitle,
    UUID accountGroupId, String accountGroupCode, String accountGroupTitle,
    UUID parentAccountGroupId, MasterDataLifecycleStatus accountGroupStatus,
    MasterDataLifecycleStatus status, LocalDate validFrom, LocalDate validTo, long version,
    Instant createdAt, UUID createdBy, Instant updatedAt, UUID updatedBy,
    Instant deletedAt, UUID deletedBy) {}
