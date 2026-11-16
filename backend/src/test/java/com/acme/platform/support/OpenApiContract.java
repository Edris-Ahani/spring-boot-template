package com.acme.platform.support;

import static org.assertj.core.api.Assertions.assertThat;

import com.networknt.schema.SchemaLocation;
import com.networknt.schema.SchemaRegistry;
import com.networknt.schema.dialect.Dialects;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpServletResponse;
import org.yaml.snakeyaml.LoaderOptions;
import org.yaml.snakeyaml.Yaml;
import org.yaml.snakeyaml.constructor.SafeConstructor;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.json.JsonMapper;

public final class OpenApiContract {
    private static final String LOCATION = "classpath:api-reference/openapi.yaml";
    private final JsonMapper mapper = JsonMapper.builder().build();
    private final SchemaRegistry schemas = SchemaRegistry.withDialect(Dialects.getOpenApi31());
    private final JsonNode document;

    public OpenApiContract() throws IOException {
        try (var stream = new ClassPathResource("api-reference/openapi.yaml").getInputStream()) {
            document = mapper.valueToTree(new Yaml(new SafeConstructor(new LoaderOptions())).load(stream));
        }
    }

    public JsonNode document() {
        return document;
    }

    public JsonNode assertResponse(String method, String path, MockHttpServletResponse response) throws IOException {
        String responsePointer = resolvePointer("/paths/" + escape(path) + "/" + method
                + "/responses/" + response.getStatus());
        assertThat(response.getContentType()).as("Response Content-Type").isNotNull();
        MediaType contentType = MediaType.parseMediaType(response.getContentType());
        String mediaType = contentType.getType() + "/" + contentType.getSubtype();
        String schemaPointer = responsePointer + "/content/" + escape(mediaType) + "/schema";
        JsonNode body = mapper.readTree(response.getContentAsString(StandardCharsets.UTF_8));
        assertSchema(schemaPointer, body);
        document.at(responsePointer).path("headers").properties().forEach(header -> {
            String headerPointer = resolvePointer(responsePointer + "/headers/" + escape(header.getKey()));
            String value = response.getHeader(header.getKey());
            if (document.at(headerPointer).path("required").asBoolean()) {
                assertThat(value).as("Required response header %s", header.getKey()).isNotNull();
            }
            if (value != null) assertSchema(headerPointer + "/schema", mapper.valueToTree(value));
        });
        return body;
    }

    private void assertSchema(String pointer, JsonNode value) {
        assertThat(document.at(pointer).isMissingNode()).as("Documented schema at %s", pointer).isFalse();
        var schema = schemas.getSchema(SchemaLocation.of(LOCATION + "#" + pointer));
        var errors = schema.validate(value, context -> context.executionConfig(config -> config.formatAssertionsEnabled(true)));
        assertThat(errors.stream().map(error -> error.getKeyword() + " at " + error.getInstanceLocation()).toList())
                .as("Response must match the OpenAPI schema at %s", pointer).isEmpty();
    }

    private String resolvePointer(String pointer) {
        var visited = new HashSet<String>();
        while (true) {
            assertThat(visited.add(pointer)).as("Contract references must not form a cycle").isTrue();
            JsonNode node = document.at(pointer);
            assertThat(node.isMissingNode()).as("Documented response or header at %s", pointer).isFalse();
            if (!node.has("$ref")) return pointer;
            String reference = node.path("$ref").asText();
            assertThat(reference).as("Response and header references must be local").startsWith("#/");
            pointer = reference.substring(1);
        }
    }

    private static String escape(String segment) {
        return segment.replace("~", "~0").replace("/", "~1");
    }
}
