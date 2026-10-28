package com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api;

import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.api.dto.RegulationRequirementImportDtos.*;
import com.digiaudit.grcpc.modules.masterdata.catalog.regulation.application.RegulationRequirementImportService;
import java.util.UUID;
import java.util.List;
import java.util.Locale;
import java.time.Instant;
import org.springframework.context.MessageSource;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/master-data/central/regulations/{regulationId}/requirements/import")
@PreAuthorize("@masterDataAuthorization.canManage('GOVERNANCE')")
public class RegulationRequirementImportController {
  private final RegulationRequirementImportService service;
  private final MessageSource messages;

  public RegulationRequirementImportController(RegulationRequirementImportService service, MessageSource messages) {
    this.service = service;
    this.messages = messages;
  }

  @GetMapping("/template")
  public ResponseEntity<Resource> template() {
    return ResponseEntity.ok()
        .contentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=regulation-requirements-template.xlsx")
        .body(new ClassPathResource("templates/regulation-requirements-template.xlsx"));
  }

  @PostMapping(value = "/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public Preview preview(@PathVariable UUID regulationId, @RequestParam MultipartFile file,
      @RequestParam(defaultValue = "false") boolean draft,
      @RequestParam(required = false) List<String> reservedCodes) {
    return service.preview(regulationId, file, draft, reservedCodes);
  }

  @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
  public Result commit(@PathVariable UUID regulationId, @RequestParam MultipartFile file,
      @RequestParam String fingerprint) {
    return service.commit(regulationId, file, fingerprint);
  }

  @ExceptionHandler(RegulationRequirementImportService.InvalidImportException.class)
  public ResponseEntity<ValidationError> invalid(RegulationRequirementImportService.InvalidImportException exception, Locale locale) {
    return ResponseEntity.unprocessableEntity().body(new ValidationError(Instant.now(), 422, "Unprocessable Entity",
        exception.getErrorCode(), messages.getMessage(exception.getMessageCode(), null, "Invalid import file", locale),
        List.of(), exception.preview()));
  }
}
