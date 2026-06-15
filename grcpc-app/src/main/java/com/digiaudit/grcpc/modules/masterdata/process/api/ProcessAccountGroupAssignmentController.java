package com.digiaudit.grcpc.modules.masterdata.process.api;

import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessAccountGroupAssignmentRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessAccountGroupAssignmentResponse;
import com.digiaudit.grcpc.modules.masterdata.process.application.ProcessAccountGroupAssignmentService;
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
public class ProcessAccountGroupAssignmentController {

    private final ProcessAccountGroupAssignmentService service;

    @GetMapping("/api/processes/{processNodeId}/account-group-assignments")
    @PreAuthorize("hasAuthority('PROCESS_VIEW') or hasAuthority('ACCOUNT_GROUP_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<ProcessAccountGroupAssignmentResponse> listByProcess(@PathVariable UUID processNodeId) {
        log.debug("REST request to list process account group assignments. processNodeId={}", processNodeId);
        List<ProcessAccountGroupAssignmentResponse> response = service.listByProcess(processNodeId);
        log.debug(
                "REST request completed to list process account group assignments. processNodeId={}, count={}",
                processNodeId,
                response.size()
        );
        return response;
    }

    @PostMapping("/api/process-account-group-assignments")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('PROCESS_EDIT') or hasAuthority('ACCOUNT_GROUP_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public ProcessAccountGroupAssignmentResponse assign(@Valid @RequestBody ProcessAccountGroupAssignmentRequest request, HttpServletRequest httpRequest) {
        log.debug(
                "REST request to assign process account group. processNodeId={}, accountGroupId={}",
                request.processNodeId(),
                request.accountGroupId()
        );
        ProcessAccountGroupAssignmentResponse response = service.assign(request, httpRequest);
        log.debug(
                "REST request completed to assign process account group. assignmentId={}, processNodeId={}, accountGroupId={}",
                response.assignmentId(),
                response.processNodeId(),
                response.accountGroupId()
        );
        return response;
    }

    @DeleteMapping("/api/process-account-group-assignments/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('PROCESS_EDIT') or hasAuthority('ACCOUNT_GROUP_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void remove(@PathVariable UUID id, HttpServletRequest httpRequest) {
        log.debug("REST request to remove process account group assignment. assignmentId={}", id);
        service.remove(id, httpRequest);
    }
}
