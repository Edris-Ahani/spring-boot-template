package com.acme.platform.platform.web;

import java.util.Arrays;
import java.util.stream.Collectors;

final class FailureDiagnostics {
    private static final int MAX_CAUSE_DEPTH = 8;
    private static final int MAX_APPLICATION_FRAMES = 5;

    private FailureDiagnostics() {}

    static Details describe(Throwable failure) {
        Throwable cause = failure;
        for (int depth = 0; depth < MAX_CAUSE_DEPTH && cause.getCause() != null && cause.getCause() != cause; depth++) {
            cause = cause.getCause();
        }
        String location = Arrays.stream(failure.getStackTrace())
                .filter(frame -> frame.getClassName().startsWith("com.acme.platform."))
                .limit(MAX_APPLICATION_FRAMES)
                .map(frame -> frame.getClassName() + "." + frame.getMethodName() + ":" + frame.getLineNumber())
                .collect(Collectors.joining(" <- "));
        return new Details(failure.getClass().getName(), cause.getClass().getName(), location);
    }

    record Details(String exceptionType, String causeType, String applicationFrames) {}
}
