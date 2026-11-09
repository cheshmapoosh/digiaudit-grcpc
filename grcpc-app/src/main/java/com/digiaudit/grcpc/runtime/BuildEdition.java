package com.digiaudit.grcpc.runtime;

public final class BuildEdition {
    private static final boolean MULTI_PROFILE_ENABLED =
            BuildEdition.class.getResource("single-profile.edition") == null;

    private BuildEdition() {
    }

    public static boolean multiProfileEnabled() {
        return MULTI_PROFILE_ENABLED;
    }
}
