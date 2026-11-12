package com.acme.platform.platform.web;

import java.net.URI;
import org.slf4j.MDC;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;

public final class ApiProblems {
    private ApiProblems() {}

    public static ProblemDetail create(HttpStatusCode status, String detail) {
        ProblemDetail problem = ProblemDetail.forStatusAndDetail(status, detail);
        problem.setType(URI.create("about:blank"));
        String requestId = MDC.get("requestId");
        if (requestId != null) problem.setProperty("requestId", requestId);
        return problem;
    }
}
