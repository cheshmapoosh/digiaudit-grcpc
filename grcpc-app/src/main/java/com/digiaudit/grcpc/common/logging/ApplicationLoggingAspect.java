package com.digiaudit.grcpc.common.logging;

import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.stereotype.Component;
import org.springframework.util.StopWatch;

@Slf4j
@Aspect
@Component
public class ApplicationLoggingAspect {

    @Around("within(com.digiaudit.grcpc..api..*) || within(com.digiaudit.grcpc..application..*)")
    public Object logApiAndApplicationLayers(ProceedingJoinPoint joinPoint) throws Throwable {
        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        String methodName = signature.getDeclaringType().getSimpleName() + "." + signature.getName();
        StopWatch stopWatch = new StopWatch(methodName);
        log.trace("Entering {}", methodName);
        try {
            stopWatch.start();
            Object result = joinPoint.proceed();
            stopWatch.stop();
            log.debug("Completed {} in {} ms", methodName, stopWatch.getTotalTimeMillis());
            return result;
        } catch (RuntimeException ex) {
            if (stopWatch.isRunning()) {
                stopWatch.stop();
            }
            log.warn("Business/runtime exception in {} after {} ms: {}", methodName, stopWatch.getTotalTimeMillis(), ex.getMessage());
            throw ex;
        } catch (Throwable ex) {
            if (stopWatch.isRunning()) {
                stopWatch.stop();
            }
            log.error("Unexpected exception in {} after {} ms", methodName, stopWatch.getTotalTimeMillis(), ex);
            throw ex;
        }
    }
}
