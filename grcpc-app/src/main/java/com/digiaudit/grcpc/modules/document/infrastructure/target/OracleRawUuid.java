package com.digiaudit.grcpc.modules.document.infrastructure.target;

import java.nio.ByteBuffer;
import java.util.UUID;

final class OracleRawUuid {
    private OracleRawUuid() {
    }

    static byte[] toBytes(UUID uuid) {
        ByteBuffer buffer = ByteBuffer.allocate(16);
        buffer.putLong(uuid.getMostSignificantBits());
        buffer.putLong(uuid.getLeastSignificantBits());
        return buffer.array();
    }

    static UUID fromBytes(byte[] bytes) {
        if (bytes == null || bytes.length != 16) {
            throw new IllegalArgumentException("Oracle RAW(16) UUID value is invalid");
        }
        ByteBuffer buffer = ByteBuffer.wrap(bytes);
        return new UUID(buffer.getLong(), buffer.getLong());
    }
}
