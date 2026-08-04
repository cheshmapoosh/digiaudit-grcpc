package com.digiaudit.grcpc.modules.masterdata.process.api;

import com.digiaudit.grcpc.modules.masterdata.process.api.dto.CentralProcessLifecycleCommandRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.CentralProcessResponse;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.CreateCentralProcessRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.MoveCentralProcessRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.UpdateCentralProcessRequest;
import com.digiaudit.grcpc.modules.masterdata.process.application.ProcessService;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataAggregateMutationResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/master-data/central/processes")
@RequiredArgsConstructor
public class CentralProcessController {
    private final ProcessService processService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('PROCESS_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public MasterDataAggregateMutationResponse create(@Valid @RequestBody CreateCentralProcessRequest request) {
        return processService.createProcess(request);
    }

    @GetMapping
    @PreAuthorize("hasAuthority('PROCESS_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<CentralProcessResponse> findAll(
            @RequestParam(required = false) String lifecycleStatus
    ) {
        return processService.listProcesses(lifecycleStatus);
    }

    @GetMapping("/{processId}")
    @PreAuthorize("hasAuthority('PROCESS_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public CentralProcessResponse findById(@PathVariable UUID processId) {
        return processService.getProcess(processId);
    }

    @PatchMapping("/{processId}")
    @PreAuthorize("hasAuthority('PROCESS_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public MasterDataAggregateMutationResponse update(
            @PathVariable UUID processId,
            @Valid @RequestBody UpdateCentralProcessRequest request
    ) {
        return processService.updateProcess(processId, request);
    }

    @PostMapping("/{processId}/move")
    @PreAuthorize("hasAuthority('PROCESS_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public MasterDataRevisionMutationResponse move(
            @PathVariable UUID processId,
            @Valid @RequestBody MoveCentralProcessRequest request
    ) {
        return processService.moveProcess(processId, request);
    }

    @PostMapping("/{processId}/activate")
    @PreAuthorize("hasAuthority('PROCESS_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public MasterDataRevisionMutationResponse activate(
            @PathVariable UUID processId,
            @Valid @RequestBody CentralProcessLifecycleCommandRequest request
    ) {
        return processService.activateProcess(processId, request);
    }

    @PostMapping("/{processId}/inactivate")
    @PreAuthorize("hasAuthority('PROCESS_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public MasterDataRevisionMutationResponse inactivate(
            @PathVariable UUID processId,
            @Valid @RequestBody CentralProcessLifecycleCommandRequest request
    ) {
        return processService.inactivateProcess(processId, request);
    }

    @PostMapping("/{processId}/delete")
    @PreAuthorize("hasAuthority('PROCESS_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public MasterDataRevisionMutationResponse delete(
            @PathVariable UUID processId,
            @Valid @RequestBody CentralProcessLifecycleCommandRequest request
    ) {
        return processService.deleteProcess(processId, request);
    }

    @PostMapping("/{processId}/restore")
    @PreAuthorize("hasAuthority('PROCESS_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public MasterDataRevisionMutationResponse restore(
            @PathVariable UUID processId,
            @Valid @RequestBody CentralProcessLifecycleCommandRequest request
    ) {
        return processService.restoreProcess(processId, request);
    }
}
