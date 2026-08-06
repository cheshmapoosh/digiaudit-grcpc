package com.digiaudit.grcpc.modules.document.config;

import io.minio.DeleteBucketLifecycleArgs;
import io.minio.GetBucketLifecycleArgs;
import io.minio.MinioClient;
import io.minio.SetBucketLifecycleArgs;
import io.minio.errors.ErrorResponseException;
import io.minio.messages.AbortIncompleteMultipartUpload;
import io.minio.messages.Expiration;
import io.minio.messages.LifecycleConfiguration;
import io.minio.messages.LifecycleRule;
import io.minio.messages.RuleFilter;
import io.minio.messages.Status;
import lombok.extern.slf4j.Slf4j;

import java.time.ZonedDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Slf4j
public class MinioLifecycleManager {

    public void reconcile(MinioClient client, MinioProperties properties) {
        MinioProperties.LifecycleMode mode = properties.lifecycle().mode();
        if (mode == MinioProperties.LifecycleMode.DISABLED) {
            log.info("MinIO lifecycle management is disabled for bucket {}", properties.bucket());
            return;
        }

        try {
            reconcileInternal(client, properties, mode);
        } catch (Exception ex) {
            if (mode == MinioProperties.LifecycleMode.VALIDATE) {
                log.warn(
                        "MinIO lifecycle validation could not be completed for bucket {}: {}",
                        properties.bucket(),
                        safeMessage(ex)
                );
                return;
            }
            throw new IllegalStateException(
                    "MinIO lifecycle reconciliation failed for bucket " + properties.bucket() + ": " + safeMessage(ex),
                    ex
            );
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

        List<LifecycleRule> merged = new ArrayList<>();
        for (LifecycleRule rule : current) {
            if (!isOwnedRule(rule.id())) {
                merged.add(rule);
            }
        }
        merged.addAll(desiredManaged);

        if (merged.isEmpty()) {
            client.deleteBucketLifecycle(DeleteBucketLifecycleArgs.builder()
                    .bucket(properties.bucket())
                    .build());
        } else {
            client.setBucketLifecycle(SetBucketLifecycleArgs.builder()
                    .bucket(properties.bucket())
                    .config(new LifecycleConfiguration(merged))
                    .build());
        }

        List<LifecycleRule> applied = readRules(client, properties.bucket());
        if (!managedRulesMatch(applied, desiredManaged)
                || !unmanagedRuleIdCounts(current).equals(unmanagedRuleIdCounts(applied))) {
            throw new IllegalStateException("MinIO did not retain the required managed and unrelated lifecycle rules");
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
        List<LifecycleRule> rules = new ArrayList<>();
        String prefix = properties.normalizedTemporaryPrefix();
        MinioProperties.TempExpiration expiration = properties.lifecycle().tempExpiration();
        if (expiration.enabled()) {
            rules.add(new LifecycleRule(
                    Status.ENABLED,
                    null,
                    new Expiration((ZonedDateTime) null, expiration.expireDays(), null),
                    new RuleFilter(prefix),
                    expiration.ruleId(),
                    null,
                    null,
                    null
            ));
        }
        MinioProperties.IncompleteMultipart multipart = properties.lifecycle().incompleteMultipart();
        if (multipart.enabled()) {
            rules.add(new LifecycleRule(
                    Status.ENABLED,
                    new AbortIncompleteMultipartUpload(multipart.abortAfterDays()),
                    null,
                    new RuleFilter(prefix),
                    multipart.ruleId(),
                    null,
                    null,
                    null
            ));
        }
        return List.copyOf(rules);
    }

    private boolean managedRulesMatch(List<LifecycleRule> current, List<LifecycleRule> desired) {
        Map<String, LifecycleRule> desiredById = byUniqueId(desired);
        Map<String, LifecycleRule> currentManaged = new HashMap<>();
        int managedCount = 0;
        for (LifecycleRule rule : current) {
            if (isOwnedRule(rule.id())) {
                managedCount++;
                if (currentManaged.put(rule.id(), rule) != null) {
                    return false;
                }
            }
        }
        if (managedCount != desired.size() || !currentManaged.keySet().equals(desiredById.keySet())) {
            return false;
        }
        return desiredById.entrySet().stream()
                .allMatch(entry -> lifecycleRuleMatches(currentManaged.get(entry.getKey()), entry.getValue()));
    }

    private Map<String, LifecycleRule> byUniqueId(List<LifecycleRule> rules) {
        Map<String, LifecycleRule> byId = new HashMap<>();
        for (LifecycleRule rule : rules) {
            if (byId.put(rule.id(), rule) != null) {
                throw new IllegalStateException("Duplicate desired MinIO lifecycle rule ID: " + rule.id());
            }
        }
        return byId;
    }

    private boolean lifecycleRuleMatches(LifecycleRule actual, LifecycleRule desired) {
        if (actual == null
                || actual.status() != desired.status()
                || !Objects.equals(prefix(actual), prefix(desired))
                || !Objects.equals(expirationDays(actual), expirationDays(desired))
                || !Objects.equals(abortDays(actual), abortDays(desired))) {
            return false;
        }
        return actual.noncurrentVersionExpiration() == null
                && actual.noncurrentVersionTransition() == null
                && actual.transition() == null;
    }

    private String prefix(LifecycleRule rule) {
        return rule.filter() == null ? null : rule.filter().prefix();
    }

    private Integer expirationDays(LifecycleRule rule) {
        return rule.expiration() == null ? null : rule.expiration().days();
    }

    private Integer abortDays(LifecycleRule rule) {
        return rule.abortIncompleteMultipartUpload() == null
                ? null
                : rule.abortIncompleteMultipartUpload().daysAfterInitiation();
    }

    private Map<String, Integer> unmanagedRuleIdCounts(List<LifecycleRule> rules) {
        Map<String, Integer> counts = new HashMap<>();
        for (LifecycleRule rule : rules) {
            if (!isOwnedRule(rule.id())) {
                counts.merge(rule.id(), 1, Integer::sum);
            }
        }
        return counts;
    }

    private boolean isOwnedRule(String ruleId) {
        return MinioProperties.TEMP_EXPIRATION_RULE_ID.equals(ruleId)
                || MinioProperties.INCOMPLETE_MULTIPART_RULE_ID.equals(ruleId);
    }

    private void logValidationWarnings(List<LifecycleRule> current, List<LifecycleRule> desired, String bucket) {
        Map<String, LifecycleRule> desiredById = byUniqueId(desired);
        for (String ownedId : List.of(
                MinioProperties.TEMP_EXPIRATION_RULE_ID,
                MinioProperties.INCOMPLETE_MULTIPART_RULE_ID
        )) {
            LifecycleRule desiredRule = desiredById.get(ownedId);
            List<LifecycleRule> currentRules = current.stream()
                    .filter(rule -> ownedId.equals(rule.id()))
                    .toList();
            boolean valid = desiredRule == null
                    ? currentRules.isEmpty()
                    : currentRules.size() == 1 && lifecycleRuleMatches(currentRules.get(0), desiredRule);
            if (!valid) {
                log.warn("MinIO lifecycle rule {} is missing or inconsistent in bucket {}", ownedId, bucket);
            }
        }
    }

    private String safeMessage(Exception ex) {
        String message = ex.getMessage();
        return message == null || message.isBlank() ? ex.getClass().getSimpleName() : message;
    }
}
