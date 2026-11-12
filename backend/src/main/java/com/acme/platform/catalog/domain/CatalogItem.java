package com.acme.platform.catalog.domain;

import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import java.util.regex.Pattern;

public record CatalogItem(UUID id, String slug, String name, String description, Instant createdAt) {
    private static final Pattern SLUG_PATTERN = Pattern.compile("[a-z0-9]+(?:-[a-z0-9]+)*");
    public static final int MAX_SLUG_LENGTH = 80;
    public static final int MAX_NAME_LENGTH = 120;
    public static final int MAX_DESCRIPTION_LENGTH = 1000;

    public CatalogItem {
        Objects.requireNonNull(id, "An item identifier is required");
        Objects.requireNonNull(createdAt, "A creation time is required");
        if (slug == null || slug.length() > MAX_SLUG_LENGTH || !SLUG_PATTERN.matcher(slug).matches()) {
            throw new IllegalArgumentException("The slug must contain lowercase words separated by single hyphens");
        }
        if (name == null || name.isBlank() || name.length() > MAX_NAME_LENGTH) {
            throw new IllegalArgumentException("The name must contain between 1 and 120 characters");
        }
        if (description == null || description.length() > MAX_DESCRIPTION_LENGTH) {
            throw new IllegalArgumentException("The description must contain at most 1000 characters");
        }
        name = name.strip();
        description = description.strip();
    }
}
