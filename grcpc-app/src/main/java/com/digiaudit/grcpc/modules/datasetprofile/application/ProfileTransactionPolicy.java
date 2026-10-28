package com.digiaudit.grcpc.modules.datasetprofile.application;

import com.digiaudit.grcpc.common.security.ProfileContext;
import lombok.RequiredArgsConstructor;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Runs inside the business transaction, before its first hierarchy/query read. */
@Aspect @Component @Order(100)
@EnableTransactionManagement(order = 0)
@RequiredArgsConstructor
public class ProfileTransactionPolicy {
    private static final Object LOCKED = new Object();
    private final JdbcTemplate jdbc;
    private final ProfileAccessService access;
    private final org.springframework.beans.factory.BeanFactory beanFactory;

    public static void requireProtectedMutation() {
        if (!TransactionSynchronizationManager.isActualTransactionActive()
                || TransactionSynchronizationManager.isCurrentTransactionReadOnly()
                || !TransactionSynchronizationManager.hasResource(LOCKED)) {
            throw new IllegalStateException("Dataset mutation requires its protected business transaction");
        }
    }

    @Around("execution(public * com.digiaudit.grcpc.modules..*(..)) && "
            + "(@annotation(org.springframework.transaction.annotation.Transactional) || @within(org.springframework.transaction.annotation.Transactional))")
    public Object protect(ProceedingJoinPoint call) throws Throwable {
        var state = ProfileContext.state();
        String type = call.getSignature().getDeclaringTypeName();
        boolean business = type.contains(".modules.basicdata.") || type.contains(".modules.masterdata.") || type.contains(".modules.organization.")
                || type.contains(".modules.document.") || type.contains(".modules.securityacl.");
        boolean administration = type.contains(".modules.datasetprofile.") || type.contains(".modules.usermanagement.");
        if ((business || administration) && TransactionSynchronizationManager.isActualTransactionActive()
                && !TransactionSynchronizationManager.isCurrentTransactionReadOnly()
                && !TransactionSynchronizationManager.hasResource(LOCKED)) {
            // One Flyway-owned coordination row serializes lifecycle, membership and ownership changes
            // with dataset writes. Hierarchy guards keep their existing keys and lexical order.
            lockAdministration();
            if (business) ProfileContext.requireId();
            if (state != null && state.profileId() != null && (business || !state.root()))
                access.validate(state.profileId(), state.userId(), state.root(), true, true);
            if (business) recheckBusinessAuthorization();
            TransactionSynchronizationManager.bindResource(LOCKED, Boolean.TRUE);
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCompletion(int status) { TransactionSynchronizationManager.unbindResourceIfPossible(LOCKED); }
            });
        }
        return call.proceed();
    }

    private void lockAdministration() {
        try {
            jdbc.queryForObject("select guard_key from dataset_profile_guard where guard_key = 'ADMINISTRATION' for update wait 5", String.class);
        } catch (org.springframework.dao.DataAccessException failure) {
            Throwable cause = failure;
            while (cause != null) {
                if (cause instanceof org.springframework.dao.PessimisticLockingFailureException
                        || cause instanceof org.springframework.dao.QueryTimeoutException
                        || (cause instanceof java.sql.SQLException sql && (sql.getErrorCode() == 30006 || sql.getErrorCode() == 54 || sql.getErrorCode() == 60))) {
                    throw new com.digiaudit.grcpc.common.exception.ConflictException("PROFILE_BUSY", "profile.busy", "Profile administration is busy");
                }
                cause = cause.getCause();
            }
            throw failure; // Missing coordination row/configuration failure is never repaired at runtime.
        }
    }

    private void recheckBusinessAuthorization() {
        var attributes = org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
        if (!(attributes instanceof org.springframework.web.context.request.ServletRequestAttributes servlet)) return;
        var handler = servlet.getRequest().getAttribute(org.springframework.web.servlet.HandlerMapping.BEST_MATCHING_HANDLER_ATTRIBUTE);
        if (!(handler instanceof org.springframework.web.method.HandlerMethod method)) return;
        var annotation = method.getMethodAnnotation(org.springframework.security.access.prepost.PreAuthorize.class);
        if (annotation == null || !annotation.value().contains("@masterDataAuthorization")) return;
        // These closed business-controller expressions invoke only our live authorization bean.
        var context = new org.springframework.expression.spel.support.StandardEvaluationContext();
        context.setBeanResolver(new org.springframework.context.expression.BeanFactoryResolver(beanFactory));
        Boolean allowed = new org.springframework.expression.spel.standard.SpelExpressionParser()
                .parseExpression(annotation.value()).getValue(context, Boolean.class);
        if (!Boolean.TRUE.equals(allowed)) ProfileAccessService.deny();
    }
}
