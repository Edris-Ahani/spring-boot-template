package com.acme.platform.catalog.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

import com.acme.platform.catalog.application.CatalogRepository;
import com.acme.platform.catalog.application.CatalogService;
import com.acme.platform.catalog.domain.CatalogItem;
import com.acme.platform.platform.security.SecurityConfiguration;
import com.acme.platform.platform.security.SecurityProblemHandler;
import com.acme.platform.platform.web.ApiExceptionHandler;
import java.nio.charset.StandardCharsets;
import java.sql.SQLException;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.core.io.ClassPathResource;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.SafeConstructor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;

@WebMvcTest(controllers = CatalogController.class)
@Import({SecurityConfiguration.class, SecurityProblemHandler.class, ApiExceptionHandler.class})
class CatalogApiContractTest {
    private static final String PATH = "/api/v1/catalog";
    private static final String BODY = "{\"slug\":\"contract-item\",\"name\":\"Contract item\",\"description\":\"\"}";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper mapper;

    @Autowired
    @Qualifier("requestMappingHandlerMapping")
    private RequestMappingHandlerMapping mappings;

    @MockitoBean
    private CatalogService service;

    @MockitoBean
    private JwtDecoder decoder;

    private JsonNode contract;

    @BeforeEach
    void loadCanonicalContract() throws Exception {
        try (var stream = new ClassPathResource("api-reference/openapi.yaml").getInputStream()) {
            Object document = new Yaml(new SafeConstructor(new LoaderOptions())).load(stream);
            contract = mapper.valueToTree(document);
        }
    }

    @Test
    void everyImplementedBusinessOperationIsDocumentedAndEveryDocumentedOperationIsImplemented() {
        Set<String> implemented = new HashSet<>();
        mappings.getHandlerMethods().forEach((mapping, handler) -> {
            for (String path : mapping.getPatternValues()) {
                if (path.startsWith("/api/")) {
                    mapping.getMethodsCondition().getMethods().forEach(method -> implemented.add(method.name().toLowerCase() + " " + path));
                }
            }
        });
        Set<String> documented = new HashSet<>();
        contract.path("paths").properties().forEach(path -> path.getValue().properties().forEach(operation -> {
            if (Set.of("get", "post", "put", "patch", "delete", "head", "options", "trace").contains(operation.getKey())) {
                documented.add(operation.getKey() + " " + path.getKey());
            }
        }));
        assertThat(implemented).isNotEmpty().isEqualTo(documented);
    }

    @Test
    void successfulReadAndWriteResponsesMatchTheDocumentedFields() throws Exception {
        given(service.list(anyInt(), anyInt())).willReturn(new CatalogRepository.CatalogPage(List.of(), 0, 12, 0, 0));
        assertResponse(get(PATH), "get", 200, "CatalogPage");
        given(service.create(anyString(), anyString(), anyString())).willReturn(
                new CatalogItem(UUID.randomUUID(), "contract-item", "Contract item", "", Instant.EPOCH));
        assertResponse(write().content(BODY), "post", 201, "CatalogItem");
    }

    @Test
    void authenticationAndAuthorizationErrorsUseTheSameCorrelatedProblemContract() throws Exception {
        assertResponse(post(PATH).contentType(MediaType.APPLICATION_JSON).content(BODY), "post", 401, "Problem");
        assertResponse(post(PATH).with(jwt()).contentType(MediaType.APPLICATION_JSON).content(BODY), "post", 403, "Problem");
    }

    @Test
    void invalidJsonPaginationAndFieldValidationAreSanitizedAndCorrelated() throws Exception {
        assertResponse(write().content("{\"name\":\"secret-input\","), "post", 400, "Problem");
        assertResponse(get(PATH).param("page", "secret-input"), "get", 400, "Problem");
        assertResponse(get(PATH).param("size", "51"), "get", 400, "Problem");
        JsonNode invalid = assertResponse(write().content("{\"slug\":\"secret-input!\",\"name\":\"\",\"description\":\"\"}"), "post", 400, "Problem");
        assertThat(invalid.path("invalidFields").toString()).contains("slug", "name");
    }

    @Test
    void conflictAndUnexpectedFailuresDoNotLeakDatabaseDetails() throws Exception {
        given(service.create(anyString(), anyString(), anyString())).willThrow(
                new DataIntegrityViolationException("secret-input", new SQLException("secret-input", "23505")));
        assertResponse(write().content(BODY), "post", 409, "Problem");
        given(service.list(anyInt(), anyInt())).willThrow(new IllegalStateException("secret-input"));
        assertResponse(get(PATH), "get", 500, "Problem");
    }

    @Test
    void unsupportedRequestAndResponseMediaTypesHaveDocumentedProblems() throws Exception {
        assertResponse(write().contentType(MediaType.TEXT_PLAIN).content("secret-input"), "post", 415, "Problem");
        assertResponse(get(PATH).accept(MediaType.APPLICATION_XML), "get", 406, "Problem");
    }

    private MockHttpServletRequestBuilder write() {
        return post(PATH).with(jwt().authorities(new SimpleGrantedAuthority("SCOPE_catalog:write")))
                .contentType(MediaType.APPLICATION_JSON);
    }

    private JsonNode assertResponse(MockHttpServletRequestBuilder request, String method, int status, String schema) throws Exception {
        MvcResult result = mvc.perform(request.header("X-Request-ID", "untrusted-request-id")).andReturn();
        var response = result.getResponse();
        assertThat(response.getStatus()).isEqualTo(status);
        assertThat(contract.path("paths").path(PATH).path(method).path("responses").has(Integer.toString(status))).isTrue();
        String requestId = response.getHeader("X-Request-ID");
        assertThat(requestId).isNotNull();
        assertThat(UUID.fromString(requestId).toString()).isEqualTo(requestId);
        assertThat(response.getContentType()).startsWith(status >= 400 ? "application/problem+json" : "application/json");
        String content = response.getContentAsString(StandardCharsets.UTF_8);
        JsonNode body = mapper.readTree(content);
        JsonNode definition = contract.path("components").path("schemas").path(schema);
        definition.path("required").forEach(field -> assertThat(body.hasNonNull(field.asText())).as(field.asText()).isTrue());
        assertThat(definition.path("properties").propertyNames()).containsAll(body.propertyNames());
        if (status >= 400) {
            assertThat(body.path("status").asInt()).isEqualTo(status);
            assertThat(body.path("type").asText()).isEqualTo("about:blank");
            assertThat(body.path("instance").asText()).isEqualTo(PATH);
            assertThat(body.path("requestId").asText()).isEqualTo(requestId);
            assertThat(content).doesNotContain("secret-input", "untrusted-request-id");
        }
        return body;
    }
}
