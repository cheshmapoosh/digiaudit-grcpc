package com.digiaudit.grcpc.modules.document.api.dto;

import com.digiaudit.grcpc.modules.document.application.PatchValue;
import com.fasterxml.jackson.annotation.JsonSetter;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

public class DocumentMetadataUpdateRequest {
    @NotNull
    @PositiveOrZero
    private Long expectedVersion;

    @NotBlank
    @Size(max = 32)
    private String targetType;

    @NotNull
    private UUID targetId;

    private PatchValue<String> code = PatchValue.absent();
    private PatchValue<String> title = PatchValue.absent();
    private PatchValue<String> description = PatchValue.absent();
    private PatchValue<String> documentCategoryCode = PatchValue.absent();
    private PatchValue<LocalDate> validFrom = PatchValue.absent();
    private PatchValue<LocalDate> validTo = PatchValue.absent();

    public Long expectedVersion() {
        return expectedVersion;
    }

    public void setExpectedVersion(Long expectedVersion) {
        this.expectedVersion = expectedVersion;
    }

    public String targetType() {
        return targetType;
    }

    public void setTargetType(String targetType) {
        this.targetType = targetType;
    }

    public UUID targetId() {
        return targetId;
    }

    public void setTargetId(UUID targetId) {
        this.targetId = targetId;
    }

    public PatchValue<String> code() {
        return code;
    }

    @JsonSetter("code")
    public void setCode(String code) {
        this.code = PatchValue.present(code);
    }

    public PatchValue<String> title() {
        return title;
    }

    @JsonSetter("title")
    public void setTitle(String title) {
        this.title = PatchValue.present(title);
    }

    public PatchValue<String> description() {
        return description;
    }

    @JsonSetter("description")
    public void setDescription(String description) {
        this.description = PatchValue.present(description);
    }

    public PatchValue<String> documentCategoryCode() {
        return documentCategoryCode;
    }

    @JsonSetter("documentCategoryCode")
    public void setDocumentCategoryCode(String documentCategoryCode) {
        this.documentCategoryCode = PatchValue.present(documentCategoryCode);
    }

    public PatchValue<LocalDate> validFrom() {
        return validFrom;
    }

    @JsonSetter("validFrom")
    public void setValidFrom(LocalDate validFrom) {
        this.validFrom = PatchValue.present(validFrom);
    }

    public PatchValue<LocalDate> validTo() {
        return validTo;
    }

    @JsonSetter("validTo")
    public void setValidTo(LocalDate validTo) {
        this.validTo = PatchValue.present(validTo);
    }
}
