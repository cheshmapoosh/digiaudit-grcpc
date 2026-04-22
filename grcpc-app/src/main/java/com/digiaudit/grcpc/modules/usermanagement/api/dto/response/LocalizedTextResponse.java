package com.digiaudit.grcpc.modules.usermanagement.api.dto.response;

public record LocalizedTextResponse(
        String locale,
        String title,
        String description
) {
}
