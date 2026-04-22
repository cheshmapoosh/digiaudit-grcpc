package com.digiaudit.grcpc.modules.setup.application;

import com.digiaudit.grcpc.modules.setup.api.dto.SetupStatusResponse;
import com.digiaudit.grcpc.modules.setup.domain.repository.SystemSetupRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class SetupQueryService {

    private final SystemSetupRepository systemSetupRepository;

    public SetupStatusResponse getStatus() {
        boolean initialized = systemSetupRepository.findAll()
                .stream()
                .findFirst()
                .map(item -> item.isInitialized())
                .orElse(false);
        log.debug("Setup status requested. initialized={}", initialized);
        return new SetupStatusResponse(initialized);
    }
}
