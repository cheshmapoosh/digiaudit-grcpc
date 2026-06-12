package com.digiaudit.grcpc.modules.masterdata.process.api;

import com.digiaudit.grcpc.modules.masterdata.process.api.dto.AttachExistingControlRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ControlDetailsDto;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ControlStructureNodeDto;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ControlSummaryDto;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.CreateControlAndAssignRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.MoveControlAssignmentRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.UpdateControlAssignmentRequest;
import com.digiaudit.grcpc.modules.masterdata.process.application.ControlService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequiredArgsConstructor
public class ControlController {

    private final ControlService controlService;

    @GetMapping("/api/control-structure")
    public List<ControlStructureNodeDto> getControlStructure() {
        log.debug("REST request to get control structure");
        return controlService.getControlStructure();
    }

    @GetMapping("/api/controls")
    public List<ControlSummaryDto> listControls() {
        log.debug("REST request to list controls");
        return controlService.listControls();
    }

    @GetMapping("/api/controls/{controlId}")
    public ControlSummaryDto getControl(@PathVariable UUID controlId) {
        log.debug("REST request to get control. controlId={}", controlId);
        return controlService.getControl(controlId);
    }

    @PostMapping("/api/sub-processes/{subProcessId}/controls")
    @ResponseStatus(HttpStatus.CREATED)
    public ControlDetailsDto createAndAssign(
            @PathVariable UUID subProcessId,
            @Valid @RequestBody CreateControlAndAssignRequest request,
            HttpServletRequest httpRequest
    ) {
        log.debug("REST request to create and assign control. subProcessId={}", subProcessId);
        return controlService.createAndAssign(subProcessId, request, httpRequest);
    }

    @PostMapping("/api/sub-processes/{subProcessId}/control-assignments")
    @ResponseStatus(HttpStatus.CREATED)
    public ControlDetailsDto attachExisting(
            @PathVariable UUID subProcessId,
            @Valid @RequestBody AttachExistingControlRequest request,
            HttpServletRequest httpRequest
    ) {
        log.debug(
                "REST request to attach existing control. subProcessId={}, controlId={}",
                subProcessId,
                request.controlId()
        );
        return controlService.attachExisting(subProcessId, request, httpRequest);
    }

    @GetMapping("/api/control-assignments/{controlAssignmentId}")
    public ControlDetailsDto getAssignment(@PathVariable UUID controlAssignmentId) {
        log.debug("REST request to get control assignment. controlAssignmentId={}", controlAssignmentId);
        return controlService.getAssignment(controlAssignmentId);
    }

    @PutMapping("/api/control-assignments/{controlAssignmentId}")
    public ControlDetailsDto updateAssignment(
            @PathVariable UUID controlAssignmentId,
            @Valid @RequestBody UpdateControlAssignmentRequest request,
            HttpServletRequest httpRequest
    ) {
        log.debug("REST request to update control assignment. controlAssignmentId={}", controlAssignmentId);
        return controlService.updateAssignment(controlAssignmentId, request, httpRequest);
    }

    @DeleteMapping("/api/control-assignments/{controlAssignmentId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteAssignment(
            @PathVariable UUID controlAssignmentId,
            HttpServletRequest httpRequest
    ) {
        log.debug("REST request to delete control assignment. controlAssignmentId={}", controlAssignmentId);
        controlService.deleteAssignment(controlAssignmentId, httpRequest);
    }

    @PostMapping("/api/control-assignments/{controlAssignmentId}/move")
    public ControlDetailsDto moveAssignment(
            @PathVariable UUID controlAssignmentId,
            @Valid @RequestBody MoveControlAssignmentRequest request,
            HttpServletRequest httpRequest
    ) {
        log.debug(
                "REST request to move control assignment. controlAssignmentId={}, targetSubProcessId={}",
                controlAssignmentId,
                request.targetSubProcessId()
        );
        return controlService.moveAssignment(controlAssignmentId, request, httpRequest);
    }
}
