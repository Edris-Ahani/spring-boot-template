package com.acme.platform.catalog;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.web.servlet.MockMvc;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.utility.DockerImageName;

@SpringBootTest(properties = {
        "spring.security.oauth2.resourceserver.jwt.issuer-uri=https://identity.example.test/realms/platform",
        "spring.security.oauth2.resourceserver.jwt.jwk-set-uri=https://identity.example.test/certs",
        "spring.security.oauth2.resourceserver.jwt.audiences=platform-api"
})
@AutoConfigureMockMvc
@Import(CatalogPostgresIT.Containers.class)
class CatalogPostgresIT {
    @Autowired
    private MockMvc mvc;

    @Test
    void migrationsPersistencePaginationAndUniqueConstraintsWorkTogether() throws Exception {
        String slug = "integration-" + UUID.randomUUID();
        String body = "{\"slug\":\"" + slug + "\",\"name\":\"Integration item\",\"description\":\"Stored in PostgreSQL\"}";
        mvc.perform(post("/api/v1/catalog").with(jwt().authorities(new SimpleGrantedAuthority("SCOPE_catalog:write")))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.id").isNotEmpty());
        String result = mvc.perform(get("/api/v1/catalog?size=50")).andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        assertThat(result).contains(slug).contains("Stored in PostgreSQL");
        mvc.perform(post("/api/v1/catalog").with(jwt().authorities(new SimpleGrantedAuthority("SCOPE_catalog:write")))
                        .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.detail").value("An item with this slug already exists"));
    }

    @TestConfiguration(proxyBeanMethods = false)
    static class Containers {
        @Bean
        @ServiceConnection
        PostgreSQLContainer postgres() {
            return new PostgreSQLContainer(DockerImageName.parse("docker.io/library/postgres:18.6-alpine")
                    .asCompatibleSubstituteFor("postgres"));
        }
    }
}
