package com.acme.platform.catalog.web;

import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.BDDMockito.given;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.acme.platform.catalog.application.CatalogService;
import com.acme.platform.catalog.domain.CatalogItem;
import com.acme.platform.platform.security.SecurityConfiguration;
import com.acme.platform.platform.security.SecurityProblemHandler;
import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jose.jwk.JWKSet;
import com.nimbusds.jose.jwk.RSAKey;
import com.nimbusds.jose.jwk.gen.RSAKeyGenerator;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.sun.net.httpserver.HttpServer;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import java.util.UUID;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = CatalogController.class, properties = {
        "spring.security.oauth2.resourceserver.jwt.issuer-uri=https://identity.example.test/realms/platform",
        "spring.security.oauth2.resourceserver.jwt.audiences=platform-api"
})
@Import({SecurityConfiguration.class, SecurityProblemHandler.class})
class CatalogJwtTest {
    private static final String ISSUER = "https://identity.example.test/realms/platform";
    private static final RSAKey KEY = signingKey();
    private static final HttpServer KEYS = keyServer();
    private static final String BODY = "{\"slug\":\"signed-item\",\"name\":\"Signed item\",\"description\":\"\"}";

    @Autowired
    private MockMvc mvc;

    @MockitoBean
    private CatalogService service;

    @DynamicPropertySource
    static void keyEndpoint(DynamicPropertyRegistry registry) {
        registry.add("spring.security.oauth2.resourceserver.jwt.jwk-set-uri",
                () -> "http://127.0.0.1:" + KEYS.getAddress().getPort() + "/certs");
    }

    @AfterAll
    static void stopKeyServer() {
        KEYS.stop(0);
    }

    @Test
    void acceptsAValidSignatureIssuerAudienceAndScope() throws Exception {
        given(service.create(anyString(), anyString(), anyString())).willReturn(
                new CatalogItem(UUID.randomUUID(), "signed-item", "Signed item", "", Instant.EPOCH));
        mvc.perform(post("/api/v1/catalog").header("Authorization", "Bearer " + token(ISSUER, "platform-api", "catalog:write", Instant.now().plusSeconds(300), KEY))
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isCreated());
    }

    @Test
    void rejectsTokensIssuedForAnotherAudience() throws Exception {
        assertUnauthorized(token(ISSUER, "other-api", "catalog:write", Instant.now().plusSeconds(300), KEY));
    }

    @Test
    void rejectsTokensFromAnotherIssuer() throws Exception {
        assertUnauthorized(token("https://untrusted.example.test", "platform-api", "catalog:write", Instant.now().plusSeconds(300), KEY));
    }

    @Test
    void rejectsExpiredTokens() throws Exception {
        assertUnauthorized(token(ISSUER, "platform-api", "catalog:write", Instant.now().minusSeconds(300), KEY));
    }

    @Test
    void rejectsTokensSignedWithAnUntrustedKey() throws Exception {
        assertUnauthorized(token(ISSUER, "platform-api", "catalog:write", Instant.now().plusSeconds(300), signingKey()));
    }

    private void assertUnauthorized(String token) throws Exception {
        mvc.perform(post("/api/v1/catalog").header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isUnauthorized());
    }

    private static String token(String issuer, String audience, String scope, Instant expiration, RSAKey key) throws JOSEException {
        var claims = new JWTClaimsSet.Builder().issuer(issuer).audience(audience).subject("catalog-writer")
                .issueTime(Date.from(Instant.now().minusSeconds(600))).expirationTime(Date.from(expiration))
                .claim("scope", scope).build();
        var jwt = new SignedJWT(new JWSHeader.Builder(JWSAlgorithm.RS256).keyID(KEY.getKeyID()).build(), claims);
        jwt.sign(new RSASSASigner(key));
        return jwt.serialize();
    }

    private static RSAKey signingKey() {
        try {
            return new RSAKeyGenerator(2048).keyID("test-key").generate();
        } catch (JOSEException exception) {
            throw new ExceptionInInitializerError(exception);
        }
    }

    private static HttpServer keyServer() {
        try {
            var server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
            byte[] document = new JWKSet(KEY.toPublicJWK()).toString().getBytes(StandardCharsets.UTF_8);
            server.createContext("/certs", exchange -> {
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, document.length);
                try (var stream = exchange.getResponseBody()) {
                    stream.write(document);
                }
            });
            server.start();
            return server;
        } catch (IOException exception) {
            throw new ExceptionInInitializerError(exception);
        }
    }
}
