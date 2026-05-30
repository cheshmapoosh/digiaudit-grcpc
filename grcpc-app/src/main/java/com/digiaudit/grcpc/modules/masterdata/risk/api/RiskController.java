package com.digiaudit.grcpc.modules.masterdata.risk.api;

import com.digiaudit.grcpc.modules.masterdata.risk.api.dto.RiskNodeRequest;
import com.digiaudit.grcpc.modules.masterdata.risk.api.dto.RiskNodeResponse;
import com.digiaudit.grcpc.modules.masterdata.risk.application.RiskService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/risks")
@RequiredArgsConstructor
public class RiskController {

    private final RiskService riskService;

    @GetMapping
    @PreAuthorize("hasAuthority('RISK_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<RiskNodeResponse> findAll() {
        log.debug("REST request to find all risks");
        return riskService.findAll();
    }

    @GetMapping("/roots")
    @PreAuthorize("hasAuthority('RISK_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<RiskNodeResponse> findRoots() {
        return riskService.findRoots();
    }

    @GetMapping("/children/{parentId}")
    @PreAuthorize("hasAuthority('RISK_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<RiskNodeResponse> findChildren(@PathVariable UUID parentId) {
        return riskService.findChildren(parentId);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('RISK_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public RiskNodeResponse findById(@PathVariable UUID id) {
        return riskService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('RISK_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public RiskNodeResponse create(@RequestBody RiskNodeRequest request, HttpServletRequest httpRequest) {
        return riskService.create(request, httpRequest);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('RISK_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public RiskNodeResponse update(@PathVariable UUID id, @RequestBody RiskNodeRequest request, HttpServletRequest httpRequest) {
        return riskService.update(id, request, httpRequest);
    }

    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasAuthority('RISK_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public RiskNodeResponse toggleStatus(@PathVariable UUID id, HttpServletRequest httpRequest) {
        return riskService.toggleStatus(id, httpRequest);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('RISK_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void delete(@PathVariable UUID id, HttpServletRequest httpRequest) {
        riskService.delete(id, httpRequest);
    }
}
