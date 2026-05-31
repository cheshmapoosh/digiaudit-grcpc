package com.digiaudit.grcpc.modules.masterdata.process.api;

import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessObjectiveAssignmentRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessObjectiveAssignmentResponse;
import com.digiaudit.grcpc.modules.masterdata.process.application.ProcessObjectiveAssignmentService;
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
public class ProcessObjectiveAssignmentController {

    private final ProcessObjectiveAssignmentService service;

    @GetMapping("/api/processes/{processNodeId}/objective-assignments")
    @PreAuthorize("hasAuthority('PROCESS_VIEW') or hasAuthority('OBJECTIVE_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<ProcessObjectiveAssignmentResponse> listByProcess(@PathVariable UUID processNodeId) {
        log.debug("REST request to list process objective assignments. processNodeId={}", processNodeId);
        return service.listByProcess(processNodeId);
    }

    @PostMapping("/api/process-objective-assignments")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('PROCESS_EDIT') or hasAuthority('OBJECTIVE_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public ProcessObjectiveAssignmentResponse assign(@Valid @RequestBody ProcessObjectiveAssignmentRequest request, HttpServletRequest httpRequest) {
        log.debug(
                "REST request to assign process objective. processNodeId={}, objectiveNodeId={}",
                request.processNodeId(),
                request.objectiveNodeId()
        );
        ProcessObjectiveAssignmentResponse response = service.assign(request, httpRequest);
        log.debug(
                "REST request completed to assign process objective. assignmentId={}, processNodeId={}, objectiveNodeId={}",
                response.assignmentId(),
                response.processNodeId(),
                response.objectiveNodeId()
        );
        return response;
    }

    @DeleteMapping("/api/process-objective-assignments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('PROCESS_EDIT') or hasAuthority('OBJECTIVE_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void remove(@PathVariable UUID id, HttpServletRequest httpRequest) {
        log.debug("REST request to remove process objective assignment. assignmentId={}", id);
        service.remove(id, httpRequest);
    }
}
