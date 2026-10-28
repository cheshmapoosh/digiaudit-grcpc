package com.digiaudit.grcpc.modules.basicdata.api;

import com.digiaudit.grcpc.modules.basicdata.application.BasicDataService;
import com.digiaudit.grcpc.modules.basicdata.domain.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/basic-data") @RequiredArgsConstructor
public class BasicDataController {
    private final BasicDataService service;
    public record Version(@NotNull Long version) {}
    private static final String KINDS = "/{kind:organization-types|document-types}";
    private BasicDataKind kind(String value) { return "organization-types".equals(value) ? BasicDataKind.ORGANIZATION_TYPE : BasicDataKind.DOCUMENT_TYPE; }
    @GetMapping(KINDS) @PreAuthorize("@profileAccess.canManageUsers()")
    public List<BasicDataType> list(@PathVariable String kind) { return service.list(kind(kind), true); }
    @GetMapping(KINDS + "/options")
    public List<BasicDataType> options(@PathVariable String kind) { return service.list(kind(kind), false); }
    @PostMapping(KINDS) @PreAuthorize("@profileAccess.canManageUsers()")
    public BasicDataType create(@PathVariable String kind, @Valid @RequestBody BasicDataService.Save request, HttpServletRequest http) { return service.save(kind(kind), null, request, http); }
    @PutMapping(KINDS + "/{id}") @PreAuthorize("@profileAccess.canManageUsers()")
    public BasicDataType update(@PathVariable String kind, @PathVariable UUID id, @Valid @RequestBody BasicDataService.Save request, HttpServletRequest http) { return service.save(kind(kind), id, request, http); }
    @PostMapping(KINDS + "/{id}/{command:activate|inactivate|delete}") @PreAuthorize("@profileAccess.canManageUsers()")
    public BasicDataType lifecycle(@PathVariable String kind, @PathVariable UUID id, @PathVariable String command, @Valid @RequestBody Version request, HttpServletRequest http) { return service.lifecycle(kind(kind), id, command, request.version(), http); }
}
