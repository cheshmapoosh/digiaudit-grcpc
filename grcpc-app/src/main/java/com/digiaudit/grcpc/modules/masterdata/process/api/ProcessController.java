package com.digiaudit.grcpc.modules.masterdata.process.api;

import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessNodeRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessNodeResponse;
import com.digiaudit.grcpc.modules.masterdata.process.application.ProcessService;
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
@RequestMapping("/api/processes")
@RequiredArgsConstructor
public class ProcessController {

    private final ProcessService processService;

    @GetMapping
    @PreAuthorize("hasAuthority('PROCESS_VIEW') or hasAuthority('CONTROL_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<ProcessNodeResponse> findAll() {
        log.debug("REST request to find all processes");
        return processService.findAll();
    }

    @GetMapping("/roots")
    @PreAuthorize("hasAuthority('PROCESS_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<ProcessNodeResponse> findRoots() {
        return processService.findRoots();
    }

    @GetMapping("/children/{parentId}")
    @PreAuthorize("hasAuthority('PROCESS_VIEW') or hasAuthority('CONTROL_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<ProcessNodeResponse> findChildren(@PathVariable UUID parentId) {
        return processService.findChildren(parentId);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('PROCESS_VIEW') or hasAuthority('CONTROL_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public ProcessNodeResponse findById(@PathVariable UUID id) {
        return processService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('PROCESS_EDIT') or hasAuthority('CONTROL_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public ProcessNodeResponse create(@RequestBody ProcessNodeRequest request, HttpServletRequest httpRequest) {
        return processService.create(request, httpRequest);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('PROCESS_EDIT') or hasAuthority('CONTROL_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public ProcessNodeResponse update(@PathVariable UUID id, @RequestBody ProcessNodeRequest request, HttpServletRequest httpRequest) {
        return processService.update(id, request, httpRequest);
    }

    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasAuthority('PROCESS_EDIT') or hasAuthority('CONTROL_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public ProcessNodeResponse toggleStatus(@PathVariable UUID id, HttpServletRequest httpRequest) {
        return processService.toggleStatus(id, httpRequest);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('PROCESS_EDIT') or hasAuthority('CONTROL_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void delete(@PathVariable UUID id, HttpServletRequest httpRequest) {
        processService.delete(id, httpRequest);
    }
}
