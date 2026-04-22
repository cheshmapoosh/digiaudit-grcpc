package com.digiaudit.grcpc.modules.setup.api;

import com.digiaudit.grcpc.modules.setup.api.dto.InitializeSystemRequest;
import com.digiaudit.grcpc.modules.setup.api.dto.SetupStatusResponse;
import com.digiaudit.grcpc.modules.setup.application.SetupApplicationService;
import com.digiaudit.grcpc.modules.setup.application.SetupQueryService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/setup")
@RequiredArgsConstructor
public class SetupController {

    private final SetupQueryService setupQueryService;
    private final SetupApplicationService setupApplicationService;

    @GetMapping("/status")
    public SetupStatusResponse getStatus() {
        log.debug("HTTP GET /api/setup/status");
        return setupQueryService.getStatus();
    }

    @PostMapping("/initialize")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void initialize(@Valid @RequestBody InitializeSystemRequest request, HttpServletRequest httpServletRequest) {
        log.debug("HTTP POST /api/setup/initialize for username={}", request.username());
        setupApplicationService.initialize(request, httpServletRequest);
    }
}
