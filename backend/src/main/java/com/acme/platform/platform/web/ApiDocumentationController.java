package com.acme.platform.platform.web;

import java.net.URI;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.core.io.ClassPathResource;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@ConditionalOnProperty(name = "platform.api-docs.enabled", havingValue = "true")
public class ApiDocumentationController {
    private static final String CONTENT_SECURITY_POLICY = "default-src 'none'; script-src 'self'; "
            + "style-src 'self' 'unsafe-inline'; connect-src 'self'; img-src 'self' data: blob:; "
            + "font-src 'self' data:; worker-src 'self' blob:; frame-ancestors 'none'; "
            + "base-uri 'none'; form-action 'none'; object-src 'none'";

    @GetMapping("/docs")
    public ResponseEntity<Resource> documentation() {
        return resource("api-reference/index.html", MediaType.TEXT_HTML);
    }

    @GetMapping("/docs/")
    public ResponseEntity<Void> canonicalDocumentation() {
        return ResponseEntity.status(HttpStatus.PERMANENT_REDIRECT).location(URI.create("../docs")).build();
    }

    @GetMapping("/docs/openapi.yaml")
    public ResponseEntity<Resource> specification() {
        return resource("api-reference/openapi.yaml", MediaType.parseMediaType("application/yaml"));
    }

    @GetMapping("/docs/scalar.js")
    public ResponseEntity<Resource> scalarBundle() {
        return resource("META-INF/resources/webjars/scalar/scalar.js", MediaType.parseMediaType("application/javascript"));
    }

    @GetMapping("/docs/config.js")
    public ResponseEntity<Resource> configuration() {
        return resource("api-reference/config.js", MediaType.parseMediaType("application/javascript"));
    }

    private ResponseEntity<Resource> resource(String location, MediaType contentType) {
        return ResponseEntity.ok().contentType(contentType).cacheControl(CacheControl.noStore())
                .header("Content-Security-Policy", CONTENT_SECURITY_POLICY)
                .header("Referrer-Policy", "no-referrer")
                .body(new ClassPathResource(location));
    }
}
