package com.digiaudit.grcpc;

import com.digiaudit.grcpc.runtime.LegacyRuntimeQuarantineTypeFilter;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.SpringBootConfiguration;
import org.springframework.boot.autoconfigure.EnableAutoConfiguration;
import org.springframework.context.annotation.ComponentScan;
import org.springframework.context.annotation.FilterType;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;

@SpringBootConfiguration
@EnableAutoConfiguration
@ComponentScan(
        basePackages = "com.digiaudit.grcpc",
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.CUSTOM,
                classes = LegacyRuntimeQuarantineTypeFilter.class
        )
)
@EnableJpaRepositories(
        basePackages = "com.digiaudit.grcpc",
        excludeFilters = @ComponentScan.Filter(
                type = FilterType.CUSTOM,
                classes = LegacyRuntimeQuarantineTypeFilter.class
        )
)
public class GrcpcApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(GrcpcApiApplication.class, args);
    }

}
