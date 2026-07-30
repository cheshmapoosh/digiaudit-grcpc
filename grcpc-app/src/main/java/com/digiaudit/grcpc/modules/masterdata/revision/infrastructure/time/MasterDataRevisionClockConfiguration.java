package com.digiaudit.grcpc.modules.masterdata.revision.infrastructure.time;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

@Configuration
public class MasterDataRevisionClockConfiguration {
    @Bean("masterDataRevisionClock")
    public Clock masterDataRevisionClock() {
        return Clock.systemUTC();
    }
}
