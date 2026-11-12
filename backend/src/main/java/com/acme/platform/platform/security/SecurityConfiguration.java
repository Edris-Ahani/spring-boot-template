package com.acme.platform.platform.security;

import org.springframework.context.annotation.Bean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.authorization.AuthorizationDecision;
import org.springframework.security.web.SecurityFilterChain;

@Configuration(proxyBeanMethods = false)
@EnableMethodSecurity
public class SecurityConfiguration {
    @Bean
    SecurityFilterChain apiSecurity(HttpSecurity http, SecurityProblemHandler problems,
            @Value("${platform.api-docs.enabled:false}") boolean apiDocsEnabled) throws Exception {
        return http
                // This API accepts bearer headers only; browser cookies never authenticate a request.
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .requestCache(cache -> cache.disable())
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(HttpMethod.GET, "/livez", "/readyz", "/actuator/health", "/actuator/health/**").permitAll()
                        // Prometheus is exposed exclusively on the unpublished management listener.
                        .requestMatchers(HttpMethod.GET, "/actuator/prometheus").permitAll()
                        .requestMatchers(HttpMethod.GET, "/docs", "/docs/", "/docs/openapi.yaml", "/docs/scalar.js", "/docs/config.js")
                        .access((authentication, context) -> new AuthorizationDecision(apiDocsEnabled))
                        .requestMatchers(HttpMethod.GET, "/api/v1/catalog").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/v1/catalog").hasAuthority("SCOPE_catalog:write")
                        .anyRequest().denyAll())
                .exceptionHandling(exceptions -> exceptions.authenticationEntryPoint(problems).accessDeniedHandler(problems))
                .oauth2ResourceServer(resourceServer -> resourceServer
                        .jwt(Customizer.withDefaults())
                        .authenticationEntryPoint(problems)
                        .accessDeniedHandler(problems))
                .build();
    }
}
