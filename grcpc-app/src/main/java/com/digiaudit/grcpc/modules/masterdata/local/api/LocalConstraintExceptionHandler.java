package com.digiaudit.grcpc.modules.masterdata.local.api;

import com.digiaudit.grcpc.common.api.ApiErrorResponse;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import org.springframework.context.MessageSource;
import org.springframework.core.annotation.Order;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

/** Maps only the known Local business-key constraints; never exposes database text. */
@Order(-1)
@RestControllerAdvice(basePackages = "com.digiaudit.grcpc.modules.masterdata.local.api")
public class LocalConstraintExceptionHandler {
  private static final Set<String> BUSINESS_KEYS = Set.of(
      "UK_LOCAL_ORG_SP_SCOPE", "UK_LOCAL_SP_CONTROL_SCOPE",
      "UK_LOCAL_SP_RISK_SCOPE", "UK_LOCAL_SP_OBJECTIVE_SCOPE",
      "UK_LOCAL_SP_REQUIREMENT_SCOPE", "UK_LOCAL_RISK_CONTROL_COV",
      "UK_LOCAL_RISK_OBJECTIVE_COV", "UK_LOCAL_CONTROL_OBJECTIVE_COV",
      "UK_LOCAL_REQUIREMENT_CONTROL_COV", "UK_LOCAL_POLICY_ORG_SCOPE",
      "UK_LOCAL_POLICY_SP_SCOPE", "UK_LOCAL_POLICY_CONTROL_SCOPE",
      "UK_LOCAL_POLICY_REQ_SCOPE");

  private final MessageSource messages;

  public LocalConstraintExceptionHandler(MessageSource messages) {
    this.messages = messages;
  }

  @ExceptionHandler(DataIntegrityViolationException.class)
  public ResponseEntity<ApiErrorResponse> integrity(DataIntegrityViolationException failure,
      Locale locale) {
    String constraint = null;
    for (Throwable cause = failure; cause != null; cause = cause.getCause()) {
      if (cause instanceof org.hibernate.exception.ConstraintViolationException violation
          && violation.getConstraintName() != null) {
        constraint = violation.getConstraintName().toUpperCase(Locale.ROOT);
        break;
      }
    }
    String name = constraint;
    if (name != null && BUSINESS_KEYS.stream().anyMatch(name::endsWith)) {
      return response(HttpStatus.CONFLICT, "DUPLICATE_RELATION",
          "error.masterdata.local.DUPLICATE_RELATION", locale);
    }
    return response(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR",
        "error.internal", locale);
  }

  private ResponseEntity<ApiErrorResponse> response(HttpStatus status, String code,
      String messageKey, Locale locale) {
    String message = messages.getMessage(messageKey, null, "Local operation failed", locale);
    return ResponseEntity.status(status).body(new ApiErrorResponse(
        Instant.now(), status.value(), status.getReasonPhrase(), code,
        message, message, List.of(), null, null, null));
  }
}
