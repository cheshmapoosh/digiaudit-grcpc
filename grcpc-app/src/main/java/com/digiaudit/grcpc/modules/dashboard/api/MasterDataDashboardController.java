package com.digiaudit.grcpc.modules.dashboard.api;

import com.digiaudit.grcpc.modules.dashboard.application.MasterDataDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/dashboard/master-data")
@RequiredArgsConstructor
public class MasterDataDashboardController {
    private final MasterDataDashboardService service;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public MasterDataDashboardResponse get() {
        return service.get();
    }
}
