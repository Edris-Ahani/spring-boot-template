package com.acme.platform.catalog.web;

import com.acme.platform.catalog.application.CatalogService;
import com.acme.platform.catalog.domain.CatalogItem;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping(value = "/api/v1/catalog", produces = MediaType.APPLICATION_JSON_VALUE)
public class CatalogController {
    private final CatalogService service;

    public CatalogController(CatalogService service) {
        this.service = service;
    }

    @GetMapping
    public CatalogPageResponse list(@RequestParam(defaultValue = "0") @Min(0) @Max(10000) int page,
                                    @RequestParam(defaultValue = "12") @Min(1) @Max(50) int size) {
        var result = service.list(page, size);
        return new CatalogPageResponse(result.items().stream().map(CatalogItemResponse::from).toList(),
                result.page(), result.size(), result.totalElements(), result.totalPages());
    }

    @PostMapping(consumes = MediaType.APPLICATION_JSON_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public CatalogItemResponse create(@Valid @RequestBody CreateCatalogItemRequest request) {
        return CatalogItemResponse.from(service.create(request.slug(), request.name(), request.description()));
    }

    public record CreateCatalogItemRequest(
            @NotBlank @Size(max = CatalogItem.MAX_SLUG_LENGTH) @Pattern(regexp = "[a-z0-9]+(?:-[a-z0-9]+)*") String slug,
            @NotBlank @Size(max = CatalogItem.MAX_NAME_LENGTH) String name,
            @NotNull @Size(max = CatalogItem.MAX_DESCRIPTION_LENGTH) String description) {}

    public record CatalogItemResponse(UUID id, String slug, String name, String description, Instant createdAt) {
        static CatalogItemResponse from(CatalogItem item) {
            return new CatalogItemResponse(item.id(), item.slug(), item.name(), item.description(), item.createdAt());
        }
    }

    public record CatalogPageResponse(List<CatalogItemResponse> items, int page, int size, long totalElements, int totalPages) {}
}
