package com.digiaudit.grcpc.modules.document.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;

@Configuration
public class DocumentClockConfiguration {
    @Bean("documentClock")
    public Clock documentClock() {
        return Clock.systemUTC();
    }
}
