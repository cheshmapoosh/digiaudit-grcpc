package com.digiaudit.grcpc.modules.masterdata.local.api;

import com.digiaudit.grcpc.common.api.ApiErrorResponse;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import org.springframework.context.MessageSource;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MissingServletRequestParameterException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.MethodArgumentTypeMismatchException;

/** Local parsing failures must not alter the established Central exception contract. */
@Order(-1)
@RestControllerAdvice(basePackages = "com.digiaudit.grcpc.modules.masterdata.local.api")
public class LocalParsingExceptionHandler {
  private final MessageSource messages;

  public LocalParsingExceptionHandler(MessageSource messages) {
    this.messages = messages;
  }

  @ExceptionHandler({HttpMessageNotReadableException.class,
      MethodArgumentTypeMismatchException.class, MissingServletRequestParameterException.class})
  public ResponseEntity<ApiErrorResponse> invalidInput(Exception exception, Locale locale) {
    String userMessage = messages.getMessage("error.validation.failed", null, "Validation failed", locale);
    return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(new ApiErrorResponse(
        Instant.now(), 400, "Bad Request", "VALIDATION_FAILED", userMessage,
        "Invalid Local request input", List.of(), null, null, null));
  }
}
