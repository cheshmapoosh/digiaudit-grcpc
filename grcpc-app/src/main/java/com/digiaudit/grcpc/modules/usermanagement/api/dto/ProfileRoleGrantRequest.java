package com.digiaudit.grcpc.modules.usermanagement.api.dto;

import jakarta.validation.constraints.NotNull;
import java.time.LocalDateTime;
import java.util.UUID;

public record ProfileRoleGrantRequest(@NotNull UUID roleId, LocalDateTime validFrom, LocalDateTime validTo) {}
