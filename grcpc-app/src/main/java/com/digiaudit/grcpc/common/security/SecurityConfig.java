package com.digiaudit.grcpc.common.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.MessageSource;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.AuthenticationFilter;
import org.springframework.security.web.authentication.AuthenticationSuccessHandler;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.servlet.util.matcher.PathPatternRequestMatcher;

import java.util.Map;
import java.util.Objects;

@Slf4j
@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    public static final String LOGIN_URL = "/api/auth/login";
    public static final String LOGOUT_URL = "/api/auth/logout";

    @Bean
    public SecurityContextRepository securityContextRepository() {
        return new HttpSessionSecurityContextRepository();
    }

    @Bean
    public AuthenticationFilter jsonLoginAuthenticationFilter(
            AuthenticationManager authenticationManager,
            JsonUsernamePasswordAuthenticationConverter authenticationConverter,
            SecurityContextRepository securityContextRepository,
            ObjectMapper objectMapper,
            MessageSource messageSource
    ) {
        AuthenticationFilter filter = new AuthenticationFilter(authenticationManager, authenticationConverter);

        filter.setRequestMatcher(
                PathPatternRequestMatcher.withDefaults().matcher(HttpMethod.POST, LOGIN_URL)
        );

        AuthenticationSuccessHandler successHandler = new AuthenticationSuccessHandler() {
            @Override
            public void onAuthenticationSuccess(
                    HttpServletRequest request,
                    HttpServletResponse response,
                    Authentication authentication
            ) {
                saveSecurityContext(request, response, authentication, securityContextRepository);

                log.info(
                        "Login successful. username={}, authorities={}",
                        authentication.getName(),
                        authentication.getAuthorities().size()
                );

                response.setStatus(HttpServletResponse.SC_NO_CONTENT);
            }

            @Override
            public void onAuthenticationSuccess(
                    HttpServletRequest request,
                    HttpServletResponse response,
                    FilterChain chain,
                    Authentication authentication
            ) {
                saveSecurityContext(request, response, authentication, securityContextRepository);

                log.info(
                        "Login successful with chain. username={}, authorities={}",
                        authentication.getName(),
                        authentication.getAuthorities().size()
                );

                response.setStatus(HttpServletResponse.SC_NO_CONTENT);
            }
        };

        filter.setSuccessHandler(successHandler);

        filter.setFailureHandler((request, response, exception) -> {
            String localizedMessage = messageSource.getMessage(
                    "security.auth.login.failed",
                    null,
                    "Invalid username or password",
                    request.getLocale()
            );

            String attemptedUsername = request.getParameter("username");
            if (attemptedUsername == null || attemptedUsername.isBlank()) {
                attemptedUsername = "unknown";
            }

            log.warn(
                    "Login failed. username={}, reason={}",
                    attemptedUsername,
                    exception.getMessage()
            );

            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
            objectMapper.writeValue(
                    response.getWriter(),
                    Map.of(
                            "message", Objects.requireNonNull(localizedMessage),
                            "code", "AUTHENTICATION_FAILED"
                    )
            );
        });

        return filter;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            SecurityContextRepository securityContextRepository,
            AuthenticationFilter jsonLoginAuthenticationFilter
    ) throws Exception {
        log.info("Configuring Spring Security filter chain");

        return http
                .csrf(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable)
                .securityContext(security -> security.securityContextRepository(securityContextRepository))
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
                .exceptionHandling(ex -> ex.authenticationEntryPoint(new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED)))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/error").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/setup/status").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/setup/initialize").permitAll()
                        .requestMatchers(HttpMethod.POST, LOGIN_URL).permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/auth/me").permitAll()
                        .anyRequest().authenticated()
                )
                .logout(logout -> logout
                        .logoutUrl(LOGOUT_URL)
                        .addLogoutHandler((request, response, authentication) -> {
                            String username = authentication != null ? authentication.getName() : "anonymous";
                            log.info("Logout requested. username={}", username);
                        })
                        .invalidateHttpSession(true)
                        .clearAuthentication(true)
                        .deleteCookies("JSESSIONID")
                        .logoutSuccessHandler((request, response, authentication) -> {
                            String username = authentication != null ? authentication.getName() : "anonymous";
                            log.info("Logout successful. username={}", username);
                            response.setStatus(HttpServletResponse.SC_NO_CONTENT);
                        })
                )
                .addFilterAt(jsonLoginAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .build();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration) throws Exception {
        return configuration.getAuthenticationManager();
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    private static void saveSecurityContext(
            HttpServletRequest request,
            HttpServletResponse response,
            Authentication authentication,
            SecurityContextRepository securityContextRepository
    ) {
        SecurityContext context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);
    }
}