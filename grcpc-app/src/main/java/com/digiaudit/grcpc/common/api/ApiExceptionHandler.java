package com.digiaudit.grcpc.common.api;

import com.digiaudit.grcpc.common.exception.ConflictException;
import com.digiaudit.grcpc.common.exception.ForbiddenException;
import com.digiaudit.grcpc.common.exception.NotFoundException;
import jakarta.validation.ConstraintViolationException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(NotFoundException.class)
    public ResponseEntity<ApiErrorResponse> handleNotFound(NotFoundException ex) {
        log.warn("Handling NotFoundException: {}", ex.getMessage());
        return build(HttpStatus.NOT_FOUND, ex.getMessage(), List.of());
    }

    @ExceptionHandler(ConflictException.class)
    public ResponseEntity<ApiErrorResponse> handleConflict(ConflictException ex) {
        log.warn("Handling ConflictException: {}", ex.getMessage());
        return build(HttpStatus.CONFLICT, ex.getMessage(), List.of());
    }

    @ExceptionHandler(ForbiddenException.class)
    public ResponseEntity<ApiErrorResponse> handleForbidden(ForbiddenException ex) {
        log.warn("Handling ForbiddenException: {}", ex.getMessage());
        return build(HttpStatus.FORBIDDEN, ex.getMessage(), List.of());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiErrorResponse> handleInvalidArgument(MethodArgumentNotValidException ex) {
        List<String> details = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .toList();
        log.warn("Handling MethodArgumentNotValidException. details={}", details);
        return build(HttpStatus.BAD_REQUEST, "Validation failed", details);
    }

    @ExceptionHandler(BindException.class)
    public ResponseEntity<ApiErrorResponse> handleBind(BindException ex) {
        List<String> details = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(error -> error.getField() + ": " + error.getDefaultMessage())
                .toList();
        log.warn("Handling BindException. details={}", details);
        return build(HttpStatus.BAD_REQUEST, "Validation failed", details);
    }

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<ApiErrorResponse> handleConstraintViolation(ConstraintViolationException ex) {
        List<String> details = ex.getConstraintViolations()
                .stream()
                .map(item -> item.getPropertyPath() + ": " + item.getMessage())
                .collect(Collectors.toList());
        log.warn("Handling ConstraintViolationException. details={}", details);
        return build(HttpStatus.BAD_REQUEST, "Validation failed", details);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiErrorResponse> handleGeneral(Exception ex) {
        log.error("Unhandled exception", ex);
        return build(HttpStatus.INTERNAL_SERVER_ERROR, ex.getMessage(), List.of());
    }

    private ResponseEntity<ApiErrorResponse> build(HttpStatus status, String message, List<String> details) {
        return ResponseEntity.status(status).body(
                new ApiErrorResponse(Instant.now(), status.value(), status.getReasonPhrase(), message, details)
        );
    }
}
