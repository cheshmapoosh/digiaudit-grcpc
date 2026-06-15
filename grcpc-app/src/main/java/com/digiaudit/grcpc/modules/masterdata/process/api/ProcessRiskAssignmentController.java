package com.digiaudit.grcpc.modules.masterdata.process.api;

import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessRiskAssignmentRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessRiskAssignmentResponse;
import com.digiaudit.grcpc.modules.masterdata.process.application.ProcessRiskAssignmentService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequiredArgsConstructor
public class ProcessRiskAssignmentController {

    private final ProcessRiskAssignmentService service;

    @GetMapping("/api/processes/{processNodeId}/risk-assignments")
    @PreAuthorize("hasAuthority('PROCESS_VIEW') or hasAuthority('RISK_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<ProcessRiskAssignmentResponse> listByProcess(@PathVariable UUID processNodeId) {
        log.debug("REST request to list process risk assignments. processNodeId={}", processNodeId);
        return service.listByProcess(processNodeId);
    }

    @PostMapping("/api/process-risk-assignments")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('PROCESS_EDIT') or hasAuthority('RISK_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public ProcessRiskAssignmentResponse assign(@Valid @RequestBody ProcessRiskAssignmentRequest request, HttpServletRequest httpRequest) {
        log.debug(
                "REST request to add process risk. processNodeId={}, riskNodeId={}",
                request.processNodeId(),
                request.riskNodeId()
        );
        ProcessRiskAssignmentResponse response = service.assign(request, httpRequest);
        log.debug(
                "REST request completed to add process risk. assignmentId={}, processNodeId={}, riskNodeId={}",
                response.assignmentId(),
                response.processNodeId(),
                response.riskNodeId()
        );
        return response;
    }

    @DeleteMapping("/api/process-risk-assignments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('PROCESS_EDIT') or hasAuthority('RISK_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void remove(@PathVariable UUID id, HttpServletRequest httpRequest) {
        log.debug("REST request to remove process risk assignment. assignmentId={}", id);
        service.remove(id, httpRequest);
    }
}
