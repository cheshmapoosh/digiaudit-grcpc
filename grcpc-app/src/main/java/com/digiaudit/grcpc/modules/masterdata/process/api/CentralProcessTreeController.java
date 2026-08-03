package com.digiaudit.grcpc.modules.masterdata.process.api;

import com.digiaudit.grcpc.modules.masterdata.process.api.dto.ProcessTreeNodeResponse;
import com.digiaudit.grcpc.modules.masterdata.process.application.ProcessService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/master-data/central/process-tree")
@RequiredArgsConstructor
public class CentralProcessTreeController {
    private final ProcessService processService;

    @GetMapping
    @PreAuthorize("hasAuthority('PROCESS_VIEW') or hasAuthority('CONTROL_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<ProcessTreeNodeResponse> findTree() {
        return processService.findProcessTree();
    }
}
