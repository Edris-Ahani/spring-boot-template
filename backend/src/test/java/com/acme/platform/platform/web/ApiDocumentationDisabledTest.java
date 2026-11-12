package com.acme.platform.platform.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.acme.platform.platform.security.SecurityConfiguration;
import com.acme.platform.platform.security.SecurityProblemHandler;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.ApplicationContext;
import org.springframework.context.annotation.Import;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(controllers = ApiDocumentationController.class)
@Import({SecurityConfiguration.class, SecurityProblemHandler.class})
class ApiDocumentationDisabledTest {
    @Autowired
    private MockMvc mvc;

    @Autowired
    private ApplicationContext context;

    @MockitoBean
    private JwtDecoder decoder;

    @Test
    void documentationIsAbsentAndInaccessibleByDefaultEvenWithAValidToken() throws Exception {
        assertThat(context.getBeansOfType(ApiDocumentationController.class)).isEmpty();
        for (String path : new String[]{"/docs", "/docs/", "/docs/openapi.yaml", "/docs/scalar.js", "/docs/config.js",
                "/api-reference/openapi.yaml", "/webjars/scalar/scalar.js"}) {
            mvc.perform(get(path)).andExpect(status().isUnauthorized());
            mvc.perform(get(path).with(jwt())).andExpect(status().isForbidden());
        }
    }
}
