package com.digiaudit.grcpc.common.api;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.ForbiddenException;
import com.digiaudit.grcpc.common.exception.BusinessException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class ApiExceptionHandler {

    private final MessageSource messageSource;

    public ApiExceptionHandler(MessageSource messageSource) {
        this.messageSource = messageSource;
    }

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(NotFoundException ex, Locale locale) {
        log.warn("Handling NotFoundException: {}", ex.getMessage());
        return build(HttpStatus.NOT_FOUND, ex, locale, List.of());
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiErrorResponse> handleConflict(ConflictException ex, Locale locale) {
        log.warn("Handling ConflictException: {}", ex.getMessage());
        return build(HttpStatus.CONFLICT, ex, locale, List.of());
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ApiErrorResponse> handleForbidden(ForbiddenException ex, Locale locale) {
        log.warn("Handling ForbiddenException: {}", ex.getMessage());
        return build(HttpStatus.FORBIDDEN, ex, locale, List.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidArgument(MethodArgumentNotValidException ex, Locale locale) {
        List<String> details = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .toList();
        log.warn("Handling MethodArgumentNotValidException. details={}", details);
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "error.validation.failed", "Validation failed", locale, details);
    }

    @ExceptionHandler(BindException.class)
    public ResponseEntity<ApiErrorResponse> handleBind(BindException ex, Locale locale) {
        List<String> details = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .toList();
        log.warn("Handling BindException. details={}", details);
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "error.validation.failed", "Validation failed", locale, details);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleConstraintViolation(ConstraintViolationException ex, Locale locale) {
        List<String> details = ex.getConstraintViolations()
                .stream()
                .map(item -> item.getPropertyPath() + ": " + item.getMessage())
                .collect(Collectors.toList());
        log.warn("Handling ConstraintViolationException. details={}", details);
        return build(HttpStatus.BAD_REQUEST, "VALIDATION_FAILED", "error.validation.failed", "Validation failed", locale, details);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGeneral(Exception ex, Locale locale) {
        log.error("Unhandled exception", ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "error.internal", ex.getMessage(), locale, List.of());
    }

    private ResponseEntity<ApiErrorResponse> build(HttpStatus status, BusinessException ex, Locale locale, List<String> details) {
        String code = ex.getErrorCode();
        String messageCode = ex.getMessageCode();
        String userMessage = messageCode == null
                ? ex.getMessage()
                : messageSource.getMessage(messageCode, ex.getMessageArgs(), ex.getMessage(), locale);
        return ResponseEntity.status(status).body(
                new ApiErrorResponse(Instant.now(), status.value(), status.getReasonPhrase(), code, userMessage, ex.getDeveloperMessage(), details)
        );
    }

    private ResponseEntity<ApiErrorResponse> build(HttpStatus status, String code, String messageCode, String developerMessage, Locale locale, List<String> details) {
        String userMessage = messageSource.getMessage(messageCode, null, developerMessage, locale);
        return ResponseEntity.status(status).body(
                new ApiErrorResponse(Instant.now(), status.value(), status.getReasonPhrase(), code, userMessage, developerMessage, details)
        );
    }
}
