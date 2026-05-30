package com.digiaudit.grcpc.modules.masterdata.objective.api;

import com.digiaudit.grcpc.modules.masterdata.objective.api.dto.ObjectiveNodeRequest;
import com.digiaudit.grcpc.modules.masterdata.objective.api.dto.ObjectiveNodeResponse;
import com.digiaudit.grcpc.modules.masterdata.objective.application.ObjectiveService;
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
@RequestMapping("/api/objectives")
@RequiredArgsConstructor
public class ObjectiveController {
    private final ObjectiveService objectiveService;

    @GetMapping
    @PreAuthorize("hasAuthority('OBJECTIVE_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<ObjectiveNodeResponse> findAll() {
        log.debug("REST request to find all objectives");
        return objectiveService.findAll();
    }

    @GetMapping("/roots")
    @PreAuthorize("hasAuthority('OBJECTIVE_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<ObjectiveNodeResponse> findRoots() {
        return objectiveService.findRoots();
    }

    @GetMapping("/children/{parentId}")
    @PreAuthorize("hasAuthority('OBJECTIVE_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public List<ObjectiveNodeResponse> findChildren(@PathVariable UUID parentId) {
        return objectiveService.findChildren(parentId);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAuthority('OBJECTIVE_VIEW') or hasAuthority('ROLE_ROOT_ADMIN')")
    public ObjectiveNodeResponse findById(@PathVariable UUID id) {
        return objectiveService.findById(id);
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("hasAuthority('OBJECTIVE_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public ObjectiveNodeResponse create(@RequestBody ObjectiveNodeRequest request, HttpServletRequest httpRequest) {
        return objectiveService.create(request, httpRequest);
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAuthority('OBJECTIVE_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public ObjectiveNodeResponse update(@PathVariable UUID id, @RequestBody ObjectiveNodeRequest request, HttpServletRequest httpRequest) {
        return objectiveService.update(id, request, httpRequest);
    }

    @PatchMapping("/{id}/toggle-status")
    @PreAuthorize("hasAuthority('OBJECTIVE_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public ObjectiveNodeResponse toggleStatus(@PathVariable UUID id, HttpServletRequest httpRequest) {
        return objectiveService.toggleStatus(id, httpRequest);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("hasAuthority('OBJECTIVE_EDIT') or hasAuthority('ROLE_ROOT_ADMIN')")
    public void delete(@PathVariable UUID id, HttpServletRequest httpRequest) {
        objectiveService.delete(id, httpRequest);
    }
}
