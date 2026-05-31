package com.digiaudit.grcpc;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class GrcpcApiApplication {

    public static void main(String[] args) {
        SpringApplication.run(GrcpcApiApplication.class, args);
    }

}
