package com.digiaudit.grcpc.modules.document.config;

import io.minio.DeleteBucketLifecycleArgs;
import io.minio.GetBucketLifecycleArgs;
import io.minio.MinioClient;
import io.minio.SetBucketLifecycleArgs;
import io.minio.Xml;
import io.minio.errors.ErrorResponseException;
import io.minio.messages.AndOperator;
import io.minio.messages.Expiration;
import io.minio.messages.LifecycleConfiguration;
import io.minio.messages.LifecycleRule;
import io.minio.messages.NoncurrentVersionExpiration;
import io.minio.messages.NoncurrentVersionTransition;
import io.minio.messages.RuleFilter;
import io.minio.messages.Status;
import io.minio.messages.Tag;
import io.minio.messages.Transition;
import lombok.extern.slf4j.Slf4j;

import java.time.Instant;
import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
public class MinioLifecycleManager {
    private static final String SDK_VERSION = sdkVersion();

    public void reconcile(MinioClient client, MinioProperties properties) {
        MinioProperties.LifecycleMode mode = properties.lifecycle().mode();
        if (mode == MinioProperties.LifecycleMode.DISABLED) {
            log.info("MinIO lifecycle management is disabled for bucket {}", properties.bucket());
            return;
        }

        try {
            reconcileInternal(client, properties, mode);
        } catch (Exception ex) {
            throw lifecycleFailure(ex, properties, mode);
        }
    }

    private void reconcileInternal(
            MinioClient client,
            MinioProperties properties,
            MinioProperties.LifecycleMode mode
    ) throws Exception {
        List<LifecycleRule> current = readRules(client, properties.bucket());
        List<LifecycleRule> desiredManaged = desiredManagedRules(properties);

        if (managedRulesMatch(current, desiredManaged)) {
            log.info("MinIO lifecycle rules are valid for bucket {}", properties.bucket());
            return;
        }

        if (mode == MinioProperties.LifecycleMode.VALIDATE) {
            logValidationWarnings(current, desiredManaged, properties.bucket());
            return;
        }

        Map<CanonicalLifecycleRule, Long> unmanagedBefore = canonicalUnmanagedRules(current);
        List<LifecycleRule> merged = new ArrayList<>();
        for (LifecycleRule rule : current) {
            if (!isOwnedRule(rule.id())) {
                merged.add(rule);
            }
        }
        merged.addAll(desiredManaged);

        if (canonicalRules(current).equals(canonicalRules(merged))) {
            log.info("MinIO lifecycle configuration is already semantically correct for bucket {}", properties.bucket());
            return;
        }

        if (merged.isEmpty()) {
            client.deleteBucketLifecycle(DeleteBucketLifecycleArgs.builder()
                    .bucket(properties.bucket())
                    .build());
        } else {
            LifecycleConfiguration configuration = new LifecycleConfiguration(merged);
            validateBeforeWrite(configuration, desiredManaged, properties);
            client.setBucketLifecycle(SetBucketLifecycleArgs.builder()
                    .bucket(properties.bucket())
                    .config(configuration)
                    .build());
        }

        List<LifecycleRule> applied = readRules(client, properties.bucket());
        if (!managedRulesMatch(applied, desiredManaged)
                || !unmanagedBefore.equals(canonicalUnmanagedRules(applied))
                || !canonicalRules(merged).equals(canonicalRules(applied))) {
            throw new IllegalStateException(
                    "MinIO did not retain the complete required managed and unrelated lifecycle rule configuration"
            );
        }
        log.info("Applied and verified MinIO lifecycle rules for bucket {}", properties.bucket());
    }

    private List<LifecycleRule> readRules(MinioClient client, String bucket) throws Exception {
        try {
            LifecycleConfiguration configuration = client.getBucketLifecycle(
                    GetBucketLifecycleArgs.builder().bucket(bucket).build()
            );
            return configuration == null || configuration.rules() == null
                    ? List.of()
                    : List.copyOf(configuration.rules());
        } catch (ErrorResponseException ex) {
            String code = ex.errorResponse() == null ? "" : ex.errorResponse().code();
            if ("NoSuchLifecycleConfiguration".equals(code) || "NoSuchLifecycle".equals(code)) {
                return List.of();
            }
            throw ex;
        }
    }

    private List<LifecycleRule> desiredManagedRules(MinioProperties properties) {
        MinioProperties.TempExpiration expiration = properties.lifecycle().tempExpiration();
        if (!expiration.enabled()) {
            return List.of();
        }
        return List.of(new LifecycleRule(
                Status.ENABLED,
                null,
                new Expiration((ZonedDateTime) null, expiration.expireDays(), null),
                new RuleFilter(properties.normalizedTemporaryPrefix()),
                expiration.ruleId(),
                null,
                null,
                null
        ));
    }

    private boolean managedRulesMatch(List<LifecycleRule> current, List<LifecycleRule> desired) {
        List<LifecycleRule> currentManaged = current.stream()
                .filter(rule -> isOwnedRule(rule.id()))
                .toList();
        return canonicalRules(currentManaged).equals(canonicalRules(desired));
    }

    private void validateBeforeWrite(
            LifecycleConfiguration configuration,
            List<LifecycleRule> desiredManaged,
            MinioProperties properties
    ) throws Exception {
        String xml = Xml.marshal(configuration);
        log.debug("MinIO lifecycle XML prepared for bucket {}: {}", properties.bucket(), sanitizeLifecycleXml(xml));
        LifecycleConfiguration roundTripped = Xml.unmarshal(LifecycleConfiguration.class, xml);
        if (!canonicalRules(configuration.rules()).equals(canonicalRules(roundTripped.rules()))) {
            throw new IllegalStateException("MinIO lifecycle configuration changed during SDK XML round-trip validation");
        }
        for (LifecycleRule rule : desiredManaged) {
            validateManagedRule(rule, properties);
        }
    }

    private void validateManagedRule(LifecycleRule rule, MinioProperties properties) {
        if (rule.id() == null || rule.id().isBlank()) {
            throw new IllegalStateException("Managed MinIO lifecycle rule ID must not be blank");
        }
        CanonicalLifecycleRule expected = canonicalRule(desiredManagedRules(properties).get(0));
        if (!expected.equals(canonicalRule(rule))) {
            throw new IllegalStateException("Managed MinIO lifecycle rule contains an unsupported filter or action");
        }
        if (rule.status() != Status.ENABLED || rule.expiration() == null) {
            throw new IllegalStateException("Managed MinIO lifecycle rule must be enabled and contain expiration days");
        }
        if (rule.abortIncompleteMultipartUpload() != null) {
            throw new IllegalStateException("AbortIncompleteMultipartUpload is not supported by the configured MinIO server");
        }
    }

    private Map<CanonicalLifecycleRule, Long> canonicalRules(List<LifecycleRule> rules) {
        return rules.stream()
                .map(this::canonicalRule)
                .collect(Collectors.groupingBy(Function.identity(), HashMap::new, Collectors.counting()));
    }

    private Map<CanonicalLifecycleRule, Long> canonicalUnmanagedRules(List<LifecycleRule> rules) {
        return canonicalRules(rules.stream().filter(rule -> !isOwnedRule(rule.id())).toList());
    }

    private CanonicalLifecycleRule canonicalRule(LifecycleRule rule) {
        return new CanonicalLifecycleRule(
                rule.id(),
                rule.status(),
                canonicalFilter(rule.filter()),
                canonicalExpiration(rule.expiration()),
                rule.abortIncompleteMultipartUpload() == null
                        ? null
                        : rule.abortIncompleteMultipartUpload().daysAfterInitiation(),
                canonicalTransition(rule.transition()),
                canonicalNoncurrentExpiration(rule.noncurrentVersionExpiration()),
                canonicalNoncurrentTransition(rule.noncurrentVersionTransition())
        );
    }

    private CanonicalFilter canonicalFilter(RuleFilter filter) {
        if (filter == null) {
            return null;
        }
        Tag tag = filter.tag();
        AndOperator and = filter.andOperator();
        return new CanonicalFilter(
                filter.prefix(),
                tag == null ? null : new CanonicalTag(tag.key(), tag.value()),
                and == null ? null : new CanonicalAnd(
                        and.prefix(),
                        and.tags() == null ? null : Map.copyOf(new TreeMap<>(and.tags())),
                        and.objectSizeLessThan(),
                        and.objectSizeGreaterThan()
                ),
                filter.objectSizeLessThan(),
                filter.objectSizeGreaterThan()
        );
    }

    private CanonicalExpiration canonicalExpiration(Expiration expiration) {
        return expiration == null
                ? null
                : new CanonicalExpiration(
                        instant(expiration.date()),
                        expiration.days(),
                        expiration.expiredObjectDeleteMarker(),
                        expiration.expiredObjectAllVersions()
                );
    }

    private CanonicalTransition canonicalTransition(Transition transition) {
        return transition == null
                ? null
                : new CanonicalTransition(
                        instant(transition.date()),
                        transition.days(),
                        transition.storageClass()
                );
    }

    private Integer canonicalNoncurrentExpiration(NoncurrentVersionExpiration expiration) {
        return expiration == null ? null : expiration.noncurrentDays();
    }

    private CanonicalNoncurrentTransition canonicalNoncurrentTransition(NoncurrentVersionTransition transition) {
        return transition == null
                ? null
                : new CanonicalNoncurrentTransition(transition.noncurrentDays(), transition.storageClass());
    }

    private Instant instant(ZonedDateTime date) {
        return date == null ? null : date.toInstant();
    }

    private boolean isOwnedRule(String ruleId) {
        return MinioProperties.TEMP_EXPIRATION_RULE_ID.equals(ruleId)
                || MinioProperties.OBSOLETE_INCOMPLETE_MULTIPART_RULE_ID.equals(ruleId);
    }

    private void logValidationWarnings(List<LifecycleRule> current, List<LifecycleRule> desired, String bucket) {
        if (!managedRulesMatch(current, desired)) {
            log.warn(
                    "MinIO lifecycle rule {} is missing or inconsistent in bucket {}; VALIDATE mode made no changes",
                    MinioProperties.TEMP_EXPIRATION_RULE_ID,
                    bucket
            );
        }
    }

    private IllegalStateException lifecycleFailure(
            Exception ex,
            MinioProperties properties,
            MinioProperties.LifecycleMode mode
    ) {
        ErrorResponseException responseException = findErrorResponse(ex);
        String errorCode = responseException == null || responseException.errorResponse() == null
                ? ex.getClass().getSimpleName()
                : safeValue(responseException.errorResponse().code());
        String errorMessage = responseException == null || responseException.errorResponse() == null
                ? safeMessage(ex)
                : safeValue(responseException.errorResponse().message());
        errorMessage = redactSecrets(errorMessage, properties);
        String requestId = responseException == null || responseException.errorResponse() == null
                ? "unavailable"
                : safeValue(responseException.errorResponse().requestId());
        String serverVersion = responseException == null || responseException.response() == null
                ? "unavailable"
                : safeValue(responseException.response().header("Server"));
        return new IllegalStateException(
                "MinIO lifecycle " + mode.name().toLowerCase() + " failed"
                        + " [errorCode=" + errorCode
                        + ", errorMessage=" + errorMessage
                        + ", requestId=" + requestId
                        + ", bucket=" + properties.bucket()
                        + ", mode=" + mode
                        + ", managedRuleId=" + properties.lifecycle().tempExpiration().ruleId()
                        + ", temporaryPrefix=" + properties.normalizedTemporaryPrefix()
                        + ", expirationDays=" + properties.lifecycle().tempExpiration().expireDays()
                        + ", serverVersion=" + serverVersion
                        + ", sdkVersion=" + SDK_VERSION + "]",
                ex
        );
    }

    private ErrorResponseException findErrorResponse(Throwable throwable) {
        Throwable current = throwable;
        while (current != null) {
            if (current instanceof ErrorResponseException responseException) {
                return responseException;
            }
            current = current.getCause();
        }
        return null;
    }

    private String safeMessage(Exception ex) {
        String message = ex.getMessage();
        return safeValue(message == null || message.isBlank() ? ex.getClass().getSimpleName() : message);
    }

    private String safeValue(String value) {
        return value == null || value.isBlank()
                ? "unavailable"
                : value.replaceAll("[\\r\\n\\t]", " ");
    }

    private String sanitizeLifecycleXml(String xml) {
        return xml.replaceAll("(?is)<Value>.*?</Value>", "<Value>***</Value>")
                .replaceAll(
                "(?is)<(AccessKey|SecretKey|Authorization)>.*?</\\1>",
                "<$1>***</$1>"
        );
    }

    private String redactSecrets(String value, MinioProperties properties) {
        String redacted = value;
        for (String secret : List.of(properties.accessKey(), properties.secretKey())) {
            if (secret != null && !secret.isBlank()) {
                redacted = redacted.replace(secret, "***");
            }
        }
        return redacted;
    }

    private static String sdkVersion() {
        String version = MinioClient.class.getPackage().getImplementationVersion();
        return version == null || version.isBlank() ? "unavailable" : version;
    }

    private record CanonicalLifecycleRule(
            String id,
            Status status,
            CanonicalFilter filter,
            CanonicalExpiration expiration,
            Integer abortIncompleteMultipartDays,
            CanonicalTransition transition,
            Integer noncurrentVersionExpirationDays,
            CanonicalNoncurrentTransition noncurrentVersionTransition
    ) {
    }

    private record CanonicalFilter(
            String directPrefix,
            CanonicalTag tag,
            CanonicalAnd and,
            Integer objectSizeLessThan,
            Integer objectSizeGreaterThan
    ) {
    }

    private record CanonicalTag(String key, String value) {
    }

    private record CanonicalAnd(
            String prefix,
            Map<String, String> tags,
            Integer objectSizeLessThan,
            Integer objectSizeGreaterThan
    ) {
    }

    private record CanonicalExpiration(
            Instant date,
            Integer days,
            Boolean expiredObjectDeleteMarker,
            Boolean expiredObjectAllVersions
    ) {
    }

    private record CanonicalTransition(Instant date, Integer days, String storageClass) {
    }

    private record CanonicalNoncurrentTransition(int days, String storageClass) {
    }
}
