package com.digiaudit.grcpc.modules.usermanagement.application.query;

import com.digiaudit.grcpc.modules.usermanagement.api.dto.response.LocalizedTextResponse;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.BusinessPermissionI18nEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.PermissionI18nEntity;
import com.digiaudit.grcpc.modules.usermanagement.domain.entity.RoleI18nEntity;
import org.springframework.stereotype.Component;

import java.util.*;

@Component
public class LocalizationSupport {

    public String normalizeLocale(String requestedLocale) {
        if (requestedLocale == null || requestedLocale.isBlank()) {
            return "fa";
        }
        return requestedLocale.trim().toLowerCase(Locale.ROOT);
    }

    public Optional<LocalizedTextResponse> resolveRoleText(Collection<RoleI18nEntity> translations, String requestedLocale) {
        return resolve(
                translations.stream()
                        .map(item -> new LocalizedTextResponse(item.getLocale(), item.getTitle(), item.getDescription()))
                        .toList(),
                requestedLocale
        );
    }

    public Optional<LocalizedTextResponse> resolvePermissionText(Collection<PermissionI18nEntity> translations, String requestedLocale) {
        return resolve(
                translations.stream()
                        .map(item -> new LocalizedTextResponse(item.getLocale(), item.getTitle(), item.getDescription()))
                        .toList(),
                requestedLocale
        );
    }

    public Optional<LocalizedTextResponse> resolveBusinessPermissionText(Collection<BusinessPermissionI18nEntity> translations, String requestedLocale) {
        return resolve(
                translations.stream()
                        .map(item -> new LocalizedTextResponse(item.getLocale(), item.getTitle(), item.getDescription()))
                        .toList(),
                requestedLocale
        );
    }

    public List<LocalizedTextResponse> sortTranslations(List<LocalizedTextResponse> translations) {
        return translations.stream()
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(LocalizedTextResponse::locale))
                .toList();
    }

    private Optional<LocalizedTextResponse> resolve(List<LocalizedTextResponse> translations, String requestedLocale) {
        if (translations == null || translations.isEmpty()) {
            return Optional.empty();
        }

        String normalized = normalizeLocale(requestedLocale);
        String languagePart = normalized.contains("-") ? normalized.substring(0, normalized.indexOf('-')) : normalized;

        return translations.stream().filter(item -> item.locale().equalsIgnoreCase(normalized)).findFirst()
                .or(() -> translations.stream().filter(item -> item.locale().equalsIgnoreCase(languagePart)).findFirst())
                .or(() -> translations.stream().filter(item -> item.locale().equalsIgnoreCase("fa")).findFirst())
                .or(() -> translations.stream().filter(item -> item.locale().equalsIgnoreCase("en")).findFirst())
                .or(() -> translations.stream().findFirst());
    }
}
