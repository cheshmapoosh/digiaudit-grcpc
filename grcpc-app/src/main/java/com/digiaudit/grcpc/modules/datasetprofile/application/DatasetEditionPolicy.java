package com.digiaudit.grcpc.modules.datasetprofile.application;

import com.digiaudit.grcpc.common.exception.ForbiddenException;
import com.digiaudit.grcpc.common.security.ProfileContext;
import com.digiaudit.grcpc.runtime.BuildEdition;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.boot.sql.init.dependency.DependsOnDatabaseInitialization;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
@DependsOnDatabaseInitialization
@RequiredArgsConstructor
public class DatasetEditionPolicy implements InitializingBean {
    // The initial dataset seeded by V1190. Display names are editable.
    private static final UUID DEFAULT_PROFILE_ID = UUID.fromString("00000000-0000-4000-8000-000000000001");
    private final JdbcTemplate jdbc;

    public static boolean allows(UUID profileId) {
        return BuildEdition.multiProfileEnabled() || DEFAULT_PROFILE_ID.equals(profileId);
    }

    public static void requireMultiProfile() {
        if (!BuildEdition.multiProfileEnabled()) {
            throw new ForbiddenException("MULTI_PROFILE_DISABLED", "profile.multiProfileDisabled",
                    "This build allows only the default dataset profile");
        }
    }

    @Override
    public void afterPropertiesSet() {
        if (BuildEdition.multiProfileEnabled()) return;
        Integer activeDefaultCount = jdbc.queryForObject(
                "select count(*) from dataset_profile where id = ? and status = 'ACTIVE'",
                Integer.class, ProfileContext.raw(DEFAULT_PROFILE_ID));
        if (activeDefaultCount == null || activeDefaultCount != 1) {
            throw new IllegalStateException("The SINGLE edition requires the active default dataset profile seeded by V1190");
        }
    }
}
