package com.digiaudit.grcpc.modules.masterdata.scope.control.api.dto;

import com.digiaudit.grcpc.modules.masterdata.shared.domain.MasterDataLifecycleStatus;
import java.util.UUID;

/** Read-only projection. A Scope ID identifies a Control occurrence under one Subprocess. */
public record ProcessControlTreeNodeResponse(
    UUID scopeId, UUID subprocessId, UUID controlId, String code, String title,
    MasterDataLifecycleStatus status) {}
