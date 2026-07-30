package com.digiaudit.grcpc.modules.masterdata.shared.domain;

public record VersionedCommand(Long version) {
    public VersionedCommand {
        if (version == null) {
            throw new IllegalArgumentException("version is required");
        }
        if (version < 0) {
            throw new IllegalArgumentException("version must not be negative");
        }
    }

    public long expectedVersion() {
        return version;
    }
}
