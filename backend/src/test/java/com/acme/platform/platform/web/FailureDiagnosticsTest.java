package com.acme.platform.platform.web;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class FailureDiagnosticsTest {
    @Test
    void retainsCodeLocationsAndCauseTypesWithoutSensitiveMessages() {
        var failure = new IllegalStateException("secret-token", new IllegalArgumentException("private-sql-value"));
        var diagnostic = FailureDiagnostics.describe(failure);
        assertThat(diagnostic.exceptionType()).isEqualTo(IllegalStateException.class.getName());
        assertThat(diagnostic.causeType()).isEqualTo(IllegalArgumentException.class.getName());
        assertThat(diagnostic.applicationFrames()).contains("FailureDiagnosticsTest.retainsCodeLocations");
        assertThat(diagnostic.toString()).doesNotContain("secret-token", "private-sql-value");
    }

    @Test
    void boundsTheNumberOfFramesAndCauseTraversal() {
        var failure = new IllegalStateException();
        var frames = new StackTraceElement[20];
        for (int index = 0; index < frames.length; index++) {
            frames[index] = new StackTraceElement("com.acme.platform.Example", "execute", "Example.java", index);
        }
        failure.setStackTrace(frames);
        var cause = new IllegalArgumentException();
        failure.initCause(cause);
        cause.initCause(failure);
        assertThat(FailureDiagnostics.describe(failure).applicationFrames().split(" <- ")).hasSize(5);
    }
}
