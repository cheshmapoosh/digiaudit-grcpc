package com.digiaudit.grcpc.modules.usermanagement.api.dto.request;

import com.digiaudit.grcpc.modules.usermanagement.api.dto.LocalizedTextRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record UpdateRoleRequest(
        @NotEmpty List<@Valid LocalizedTextRequest> translations,
        Boolean enabled
) {
}
