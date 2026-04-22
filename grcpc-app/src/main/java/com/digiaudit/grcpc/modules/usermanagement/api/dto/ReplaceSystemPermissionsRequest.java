package com.digiaudit.grcpc.modules.usermanagement.api.dto;

import com.digiaudit.grcpc.modules.usermanagement.domain.enums.PermissionCode;
import jakarta.validation.constraints.NotNull;

import java.util.Set;

public record ReplaceSystemPermissionsRequest(@NotNull Set<PermissionCode> permissions) {
}
