package com.acme.platform.platform.web;

import java.sql.SQLException;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.mvc.method.annotation.ResponseEntityExceptionHandler;
import org.springframework.web.context.request.WebRequest;

@RestControllerAdvice
public class ApiExceptionHandler extends ResponseEntityExceptionHandler {
    private static final Logger LOG = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(IllegalArgumentException.class)
    ProblemDetail invalidInput(IllegalArgumentException exception) {
        return ApiProblems.create(HttpStatus.BAD_REQUEST, "The supplied input is invalid");
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ProblemDetail integrityViolation(DataIntegrityViolationException exception) {
        if (exception.getMostSpecificCause() instanceof SQLException sql && "23505".equals(sql.getSQLState())) {
            return ApiProblems.create(HttpStatus.CONFLICT, "An item with this slug already exists");
        }
        return internalFailure(exception);
    }

    @ExceptionHandler(Exception.class)
    ProblemDetail internalFailure(Exception exception) {
        // Exception messages and stack traces can contain SQL parameters or credentials.
        LOG.error("Request failed; exceptionType={}", exception.getClass().getSimpleName());
        return ApiProblems.create(HttpStatus.INTERNAL_SERVER_ERROR, "The request could not be completed");
    }

    @Override
    protected ResponseEntity<Object> handleExceptionInternal(Exception exception, Object body,
            HttpHeaders headers, HttpStatusCode status, WebRequest request) {
        String message = switch (status.value()) {
            case 400 -> "The supplied input is invalid";
            case 404 -> "The requested resource was not found";
            case 405 -> "The HTTP method is not supported";
            case 406 -> "The requested response media type is not supported";
            case 415 -> "The request media type is not supported";
            default -> "The request could not be completed";
        };
        ProblemDetail detail = ApiProblems.create(status, message);
        if (exception instanceof MethodArgumentNotValidException validation) {
            detail.setDetail("One or more fields are invalid");
            List<String> fields = validation.getBindingResult().getFieldErrors().stream()
                    .map(error -> error.getField()).distinct().sorted().toList();
            detail.setProperty("invalidFields", fields);
        }
        return super.handleExceptionInternal(exception, detail, headers, status, request);
    }
}
