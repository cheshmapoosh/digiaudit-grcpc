package com.digiaudit.grcpc.modules.masterdata.process.api;

import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessRegulationAssignmentRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessRegulationAssignmentResponse;
import com.digiaudit.grcpc.modules.masterdata.process.application.ProcessRegulationAssignmentService;
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
public class ProcessRegulationAssignmentController {

    private final ProcessRegulationAssignmentService service;

    @GetMapping("/api/processes/{processNodeId}/regulation-assignments")
    @PreAuthorize("hasAuthority('PROCESS_VIEW') or hasAuthority('REGULATION_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<ProcessRegulationAssignmentResponse> listByProcess(@PathVariable UUID processNodeId) {
        log.debug("REST request to list process regulation assignments. processNodeId={}", processNodeId);
        return service.listByProcess(processNodeId);
    }

    @PostMapping("/api/process-regulation-assignments")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('PROCESS_EDIT') or hasAuthority('REGULATION_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public ProcessRegulationAssignmentResponse add(@Valid @RequestBody ProcessRegulationAssignmentRequest request, HttpServletRequest httpRequest) {
        log.debug(
                "REST request to add process regulation. processNodeId={}, regulationNodeId={}",
                request.processNodeId(),
                request.regulationNodeId()
        );
        ProcessRegulationAssignmentResponse response = service.add(request, httpRequest);
        log.debug(
                "REST request completed to add process regulation. assignmentId={}, processNodeId={}, regulationNodeId={}",
                response.assignmentId(),
                response.processNodeId(),
                response.regulationNodeId()
        );
        return response;
    }

    @DeleteMapping("/api/process-regulation-assignments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('PROCESS_EDIT') or hasAuthority('REGULATION_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void remove(@PathVariable UUID id, HttpServletRequest httpRequest) {
        log.debug("REST request to remove process regulation assignment. assignmentId={}", id);
        service.remove(id, httpRequest);
    }
}
