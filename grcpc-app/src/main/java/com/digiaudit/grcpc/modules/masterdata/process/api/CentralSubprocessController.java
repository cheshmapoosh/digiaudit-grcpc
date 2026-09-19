package com.digiaudit.grcpc.modules.masterdata.process.api;

import com.digiaudit.grcpc.modules.masterdata.process.api.dto.CentralSubprocessLifecycleCommandRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.CentralSubprocessResponse;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.CentralSubprocessAggregateMutationResponse;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.CreateCentralSubprocessRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.MoveCentralSubprocessRequest;
import com.digiaudit.grcpc.modules.masterdata.process.api.dto.UpdateCentralSubprocessRequest;
import com.digiaudit.grcpc.modules.masterdata.process.application.ProcessService;
import com.digiaudit.grcpc.modules.masterdata.shared.api.dto.MasterDataRevisionMutationResponse;
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
@RequestMapping("/api/master-data/central/subprocesses")
@RequiredArgsConstructor
public class CentralSubprocessController {
    private final ProcessService processService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("@masterDataAuthorization.canManage('PROCESS')")
    public CentralSubprocessAggregateMutationResponse create(@Valid @RequestBody CreateCentralSubprocessRequest request) {
        return processService.createSubprocess(request);
    }

    @GetMapping
    @PreAuthorize("@masterDataAuthorization.canView('PROCESS')")
    public List<CentralSubprocessResponse> findAll(
            @RequestParam(required = false) String lifecycleStatus
    ) {
        return processService.listSubprocesses(lifecycleStatus);
    }

    @GetMapping("/{subprocessId}")
    @PreAuthorize("@masterDataAuthorization.canView('PROCESS')")
    public CentralSubprocessResponse findById(@PathVariable UUID subprocessId) {
        return processService.getSubprocess(subprocessId);
    }

    @PatchMapping("/{subprocessId}")
    @PreAuthorize("@masterDataAuthorization.canManage('PROCESS')")
    public CentralSubprocessAggregateMutationResponse update(
            @PathVariable UUID subprocessId,
            @Valid @RequestBody UpdateCentralSubprocessRequest request
    ) {
        return processService.updateSubprocess(subprocessId, request);
    }

    @PostMapping("/{subprocessId}/move")
    @PreAuthorize("@masterDataAuthorization.canManage('PROCESS')")
    public MasterDataRevisionMutationResponse move(
            @PathVariable UUID subprocessId,
            @Valid @RequestBody MoveCentralSubprocessRequest request
    ) {
        return processService.moveSubprocess(subprocessId, request);
    }

    @PostMapping("/{subprocessId}/activate")
    @PreAuthorize("@masterDataAuthorization.canManage('PROCESS')")
    public MasterDataRevisionMutationResponse activate(
            @PathVariable UUID subprocessId,
            @Valid @RequestBody CentralSubprocessLifecycleCommandRequest request
    ) {
        return processService.activateSubprocess(subprocessId, request);
    }

    @PostMapping("/{subprocessId}/inactivate")
    @PreAuthorize("@masterDataAuthorization.canManage('PROCESS')")
    public MasterDataRevisionMutationResponse inactivate(
            @PathVariable UUID subprocessId,
            @Valid @RequestBody CentralSubprocessLifecycleCommandRequest request
    ) {
        return processService.inactivateSubprocess(subprocessId, request);
    }

    @PostMapping("/{subprocessId}/delete")
    @PreAuthorize("@masterDataAuthorization.canManage('PROCESS')")
    public MasterDataRevisionMutationResponse delete(
            @PathVariable UUID subprocessId,
            @Valid @RequestBody CentralSubprocessLifecycleCommandRequest request
    ) {
        return processService.deleteSubprocess(subprocessId, request);
    }

    @PostMapping("/{subprocessId}/restore")
    @PreAuthorize("@masterDataAuthorization.canManage('PROCESS')")
    public MasterDataRevisionMutationResponse restore(
            @PathVariable UUID subprocessId,
            @Valid @RequestBody CentralSubprocessLifecycleCommandRequest request
    ) {
        return processService.restoreSubprocess(subprocessId, request);
    }
}
