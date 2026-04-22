package com.digiaudit.grcpc.common.logging;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.slf4j.MDC;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Component
public class RequestLoggingFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String requestId = Optional.ofNullable(request.getHeader("X-Request-Id"))
                .filter(value -> !value.isBlank())
                .orElseGet(() -> UUID.randomUUID().toString());

        long start = System.currentTimeMillis();
        MDC.put("requestId", requestId);
        response.setHeader("X-Request-Id", requestId);

        try {
            log.info("Incoming request. method={}, uri={}, query={}, remoteAddr={}",
                    request.getMethod(),
                    request.getRequestURI(),
                    request.getQueryString(),
                    request.getRemoteAddr());
            filterChain.doFilter(request, response);
        } finally {
            long duration = System.currentTimeMillis() - start;
            log.info("Completed request. method={}, uri={}, status={}, durationMs={}",
                    request.getMethod(),
                    request.getRequestURI(),
                    response.getStatus(),
                    duration);
            MDC.remove("requestId");
        }
    }
}
