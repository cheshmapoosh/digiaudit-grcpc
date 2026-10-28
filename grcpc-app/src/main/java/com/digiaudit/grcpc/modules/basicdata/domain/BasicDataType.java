package com.digiaudit.grcpc.modules.basicdata.domain;

import java.util.UUID;

public record BasicDataType(UUID id, UUID profileId, String profileName, String name,
                            String description, String status, long version) {}
