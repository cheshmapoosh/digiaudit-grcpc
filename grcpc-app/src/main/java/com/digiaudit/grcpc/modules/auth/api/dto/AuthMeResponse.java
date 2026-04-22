package com.digiaudit.grcpc.modules.auth.api.dto;

import java.util.Set;
import java.util.UUID;

public record AuthMeResponse(
        boolean authenticated,
        UUID userId,
        String username,
        String firstName,
        String lastName,
        boolean rootUser,
        Set<String> authorities
) {
}