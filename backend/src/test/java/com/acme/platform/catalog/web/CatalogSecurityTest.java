package com.acme.platform.catalog.web;

import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.acme.platform.catalog.application.CatalogRepository;
import com.acme.platform.catalog.application.CatalogService;
import com.acme.platform.catalog.domain.CatalogItem;
import com.acme.platform.platform.security.SecurityConfiguration;
import com.acme.platform.platform.security.SecurityProblemHandler;
import com.acme.platform.platform.web.ApiExceptionHandler;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = CatalogController.class, properties = {
        "spring.security.oauth2.resourceserver.jwt.issuer-uri=https://identity.example.test/realms/platform",
        "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=https://identity.example.test/certs",
        "spring.security.oauth2.resourceserver.jwt.audiences=platform-api"
})
@Import({SecurityConfiguration.class, SecurityProblemHandler.class, ApiExceptionHandler.class})
class CatalogSecurityTest {
    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private CatalogService service;

    @MockitoBean
    private JwtDecoder decoder;

    private static final String VALID_BODY = """
            {"slug":"spring-platform","name":"Spring Platform","description":"A modular starter"}
            """;

    @Test
    void publicCatalogCanBeReadWithoutCredentials() throws Exception {
        given(service.list(anyInt(), anyInt())).willReturn(new CatalogRepository.CatalogPage(List.of(), 0, 12, 0, 0));
        mvc.perform(get("/api/v1/catalog")).andExpect(status().isOk()).andExpect(jsonPath("$.items").isEmpty());
    }

    @Test
    void anonymousWritesRequireAuthentication() throws Exception {
        mvc.perform(post("/api/v1/catalog").contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.status").value(401));
    }

    @Test
    void authenticatedWritesRequireTheWriteScope() throws Exception {
        mvc.perform(post("/api/v1/catalog").with(jwt()).contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
                .andExpect(status().isForbidden()).andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void authorizedWritesReturnAnExplicitDto() throws Exception {
        given(service.create(anyString(), anyString(), anyString())).willReturn(
                new CatalogItem(UUID.randomUUID(), "spring-platform", "Spring Platform", "A modular starter", Instant.EPOCH));
        mvc.perform(post("/api/v1/catalog").with(jwt().authorities(new SimpleGrantedAuthority("SCOPE_catalog:write")))
                        .contentType(MediaType.APPLICATION_JSON).content(VALID_BODY))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.slug").value("spring-platform"));
    }

    @Test
    void invalidInputReturnsFieldNamesWithoutEchoingInput() throws Exception {
        mvc.perform(post("/api/v1/catalog").with(jwt().authorities(new SimpleGrantedAuthority("SCOPE_catalog:write")))
                        .contentType(MediaType.APPLICATION_JSON).content("{\"slug\":\"BAD\",\"name\":\"\",\"description\":\"\"}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.invalidFields").isArray());
    }

    @Test
    void oversizedPagesAreRejected() throws Exception {
        mvc.perform(get("/api/v1/catalog?size=500")).andExpect(status().isBadRequest());
    }
}
