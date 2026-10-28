package com.digiaudit.grcpc.modules.datasetprofile.api;

import com.digiaudit.grcpc.modules.datasetprofile.application.DatasetProfileService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.List;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/dataset-profiles") @RequiredArgsConstructor
public class DatasetProfileController {
    private final DatasetProfileService service;
    public record Version(@NotNull Long version) {}
    @GetMapping public List<DatasetProfileService.View> selectable() { return service.list(false); }
    @GetMapping("/management") @PreAuthorize("@profileAccess.isRoot()")
    public List<DatasetProfileService.View> management() { return service.list(true); }
    @PostMapping @PreAuthorize("@profileAccess.isRoot()")
    public DatasetProfileService.View create(@Valid @RequestBody DatasetProfileService.Save request, HttpServletRequest http) { return service.save(null, request, http); }
    @PutMapping("/{id}") @PreAuthorize("@profileAccess.isRoot()")
    public DatasetProfileService.View update(@PathVariable UUID id, @Valid @RequestBody DatasetProfileService.Save request, HttpServletRequest http) { return service.save(id, request, http); }
    @PostMapping("/{id}/{command:activate|inactivate|delete|restore}") @PreAuthorize("@profileAccess.isRoot()")
    public DatasetProfileService.View lifecycle(@PathVariable UUID id, @PathVariable String command, @Valid @RequestBody Version request, HttpServletRequest http) { return service.lifecycle(id, command, request.version(), http); }
}
