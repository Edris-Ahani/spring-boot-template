package com.acme.platform.support;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.charset.StandardCharsets;
import java.util.stream.Stream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.mock.web.MockHttpServletResponse;
import tools.jackson.databind.json.JsonMapper;
import tools.jackson.databind.node.ObjectNode;

class OpenApiContractTest {
    private static final String PATH = "/api/v1/catalog";
    private static final String REQUEST_ID = "06a64cb2-dcf2-4f69-a3cb-34254ef2c9a1";
    private static final String PAGE = """
            {"items":[{"id":"8e756936-6419-4b0e-9c44-5b5ce3fa4627","slug":"contract-item",
            "name":"Contract item","description":"","createdAt":"2026-11-12T10:00:00Z"}],
            "page":0,"size":12,"totalElements":1,"totalPages":1}
            """;
    private final JsonMapper mapper = JsonMapper.builder().build();
    private OpenApiContract contract;

    @BeforeEach
    void loadContract() throws Exception {
        contract = new OpenApiContract();
    }

    @Test
    void acceptsAPopulatedPageWithACharsetParameter() throws Exception {
        assertThatCode(() -> contract.assertResponse("get", PATH, response(PAGE))).doesNotThrowAnyException();
    }

    @ParameterizedTest(name = "rejects invalid response value at {0}: {2}")
    @MethodSource("invalidCatalogValues")
    void rejectsIncompatibleTypesFormatsAndBounds(String pointer, String value, String keyword) throws Exception {
        ObjectNode page = (ObjectNode) mapper.readTree(PAGE);
        int separator = pointer.lastIndexOf('/');
        ObjectNode parent = (ObjectNode) page.at(pointer.substring(0, separator));
        parent.set(pointer.substring(separator + 1), mapper.readTree(value));
        assertThatThrownBy(() -> contract.assertResponse("get", PATH, response(page.toString())))
                .isInstanceOf(AssertionError.class).hasMessageContaining(keyword);
    }

    static Stream<Arguments> invalidCatalogValues() {
        return Stream.of(
                Arguments.of("/items/0/name", "123", "type"),
                Arguments.of("/items/0/id", "\"not-a-uuid\"", "format"),
                Arguments.of("/items/0/createdAt", "\"yesterday\"", "format"),
                Arguments.of("/items/0/slug", "\"INVALID SLUG\"", "pattern"),
                Arguments.of("/items/0/name", "\"\"", "minLength"),
                Arguments.of("/items/0/name", "\"" + "x".repeat(121) + "\"", "maxLength"),
                Arguments.of("/items/0/description", "null", "type"),
                Arguments.of("/items/0/undocumented", "true", "additionalProperties"),
                Arguments.of("/undocumented", "true", "additionalProperties"),
                Arguments.of("/items", "{}", "type"),
                Arguments.of("/page", "10001", "maximum"),
                Arguments.of("/size", "51", "maximum"),
                Arguments.of("/totalElements", "-1", "minimum"));
    }

    @Test
    void rejectsMissingNestedRequiredFields() throws Exception {
        ObjectNode page = (ObjectNode) mapper.readTree(PAGE);
        ((ObjectNode) page.at("/items/0")).remove("name");
        assertThatThrownBy(() -> contract.assertResponse("get", PATH, response(page.toString())))
                .isInstanceOf(AssertionError.class).hasMessageContaining("required");
    }

    @Test
    void rejectsOversizedCollections() throws Exception {
        ObjectNode page = (ObjectNode) mapper.readTree(PAGE);
        var item = page.at("/items/0").deepCopy();
        var items = page.putArray("items");
        for (int index = 0; index < 51; index++) items.add(item);
        assertThatThrownBy(() -> contract.assertResponse("get", PATH, response(page.toString())))
                .isInstanceOf(AssertionError.class).hasMessageContaining("maxItems");
    }

    @Test
    void resolvesProblemResponseReferencesAndRejectsInvalidProblemFields() throws Exception {
        String problem = """
                {"type":"about:blank","status":400,"title":"Bad Request","detail":"Invalid input",
                "instance":"/api/v1/catalog","requestId":"06a64cb2-dcf2-4f69-a3cb-34254ef2c9a1"}
                """;
        var response = response(problem);
        response.setStatus(400);
        response.setContentType("application/problem+json");
        assertThatCode(() -> contract.assertResponse("get", PATH, response)).doesNotThrowAnyException();
        var invalidResponse = response(problem.replace("\"status\":400", "\"status\":\"400\""));
        invalidResponse.setStatus(400);
        invalidResponse.setContentType("application/problem+json");
        assertThatThrownBy(() -> contract.assertResponse("get", PATH, invalidResponse))
                .isInstanceOf(AssertionError.class).hasMessageContaining("type");
    }

    @Test
    void rejectsUndocumentedStatusesAndMediaTypes() throws Exception {
        var response = response(PAGE);
        response.setStatus(202);
        assertThatThrownBy(() -> contract.assertResponse("get", PATH, response)).isInstanceOf(AssertionError.class);
        response.setStatus(200);
        response.setContentType("application/problem+json");
        assertThatThrownBy(() -> contract.assertResponse("get", PATH, response)).isInstanceOf(AssertionError.class);
    }

    @Test
    void validatesRequiredResponseHeaderPresenceAndFormat() throws Exception {
        var response = response(PAGE);
        response.setHeader("X-Request-ID", "invalid-id");
        assertThatThrownBy(() -> contract.assertResponse("get", PATH, response))
                .isInstanceOf(AssertionError.class).hasMessageContaining("format");
        response.setHeader("X-Request-ID", null);
        assertThatThrownBy(() -> contract.assertResponse("get", PATH, response))
                .isInstanceOf(AssertionError.class).hasMessageContaining("Required response header");
    }

    private MockHttpServletResponse response(String body) throws Exception {
        var response = new MockHttpServletResponse();
        response.setStatus(200);
        response.setContentType("application/json;charset=UTF-8");
        response.setHeader("X-Request-ID", REQUEST_ID);
        response.getOutputStream().write(body.getBytes(StandardCharsets.UTF_8));
        return response;
    }
}
