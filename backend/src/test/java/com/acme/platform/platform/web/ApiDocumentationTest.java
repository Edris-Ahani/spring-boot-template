package com.acme.platform.platform.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.acme.platform.platform.security.SecurityConfiguration;
import com.acme.platform.platform.security.SecurityProblemHandler;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = ApiDocumentationController.class, properties = "platform.api-docs.enabled=true")
@Import({SecurityConfiguration.class, SecurityProblemHandler.class})
class ApiDocumentationTest {
    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private JwtDecoder decoder;

    @Test
    void localReferenceUsesSelfHostedScriptsWithARestrictedContentSecurityPolicy() throws Exception {
        mvc.perform(get("/docs"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("text/html"))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("Foundry API Reference")))
                .andExpect(header().string("Cache-Control", "no-store"))
                .andExpect(header().string("Content-Security-Policy", org.hamcrest.Matchers.containsString("connect-src 'self'")));
        mvc.perform(get("/docs/scalar.js"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/javascript"));
        mvc.perform(get("/docs/config.js")).andExpect(status().isOk());
    }

    @Test
    void publishedContractIsByteIdenticalToTheCanonicalDocument() throws Exception {
        byte[] published = mvc.perform(get("/docs/openapi.yaml"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/yaml"))
                .andReturn().getResponse().getContentAsByteArray();
        assertThat(published).isEqualTo(Files.readAllBytes(Path.of("../contracts/openapi.yaml")));
    }

    @Test
    void trailingSlashRedirectsToTheCanonicalReference() throws Exception {
        mvc.perform(get("/docs/")).andExpect(status().isPermanentRedirect())
                .andExpect(header().string("Location", "../docs"));
    }

    @Test
    void documentationDoesNotPermitWritesOrArbitraryClasspathResources() throws Exception {
        mvc.perform(post("/docs")).andExpect(status().isUnauthorized());
        mvc.perform(get("/docs/application.yml")).andExpect(status().isUnauthorized());
        mvc.perform(get("/webjars/scalar/scalar.js")).andExpect(status().isUnauthorized());
    }
}
