package com.digiaudit.grcpc.common.security;

import com.digiaudit.grcpc.common.exception.ForbiddenException;
import java.nio.ByteBuffer;
import java.util.UUID;
import java.util.function.Supplier;

/** Immutable request dataset; never stored in the HTTP session. */
public final class ProfileContext {
    private static final ThreadLocal<State> CURRENT = new ThreadLocal<>();
    private ProfileContext() {}
    public record State(UUID profileId, UUID userId, boolean root) {}
    public static void set(State state) { CURRENT.set(state); }
    public static void clear() { CURRENT.remove(); }
    public static State state() { return CURRENT.get(); }
    public static UUID idOrNull() { return state() == null ? null : state().profileId(); }
    public static UUID requireId() {
        UUID id = idOrNull();
        if (id == null) throw new ForbiddenException("PROFILE_REQUIRED", "profile.required", "A dataset profile is required");
        return id;
    }
    public static byte[] raw(UUID id) {
        return ByteBuffer.allocate(16).putLong(id.getMostSignificantBits()).putLong(id.getLeastSignificantBits()).array();
    }
    public static final class FilterValue implements Supplier<byte[]> {
        @Override public byte[] get() { return raw(idOrNull() == null ? new UUID(0, 0) : idOrNull()); }
    }
}
