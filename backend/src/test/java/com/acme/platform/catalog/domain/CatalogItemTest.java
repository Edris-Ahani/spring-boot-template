package com.acme.platform.catalog.domain;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import java.time.Instant;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

class CatalogItemTest {
    @Test
    void stripsDisplayTextWithoutChangingTheSlug() {
        var item = new CatalogItem(UUID.randomUUID(), "spring-platform", "  Spring Platform  ", "  A starter  ", Instant.EPOCH);
        assertThat(item.name()).isEqualTo("Spring Platform");
        assertThat(item.description()).isEqualTo("A starter");
        assertThat(item.slug()).isEqualTo("spring-platform");
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "UPPERCASE", "-leading", "trailing-", "double--hyphen", "has space", "<script>"})
    void rejectsInvalidSlugs(String slug) {
        assertThatIllegalArgumentException().isThrownBy(() ->
                new CatalogItem(UUID.randomUUID(), slug, "Name", "", Instant.EPOCH));
    }

    @Test
    void rejectsBlankAndOversizedNames() {
        assertThatIllegalArgumentException().isThrownBy(() ->
                new CatalogItem(UUID.randomUUID(), "valid", "   ", "", Instant.EPOCH));
        assertThatIllegalArgumentException().isThrownBy(() ->
                new CatalogItem(UUID.randomUUID(), "valid", "a".repeat(121), "", Instant.EPOCH));
    }

    @Test
    void rejectsOversizedDescriptions() {
        assertThatIllegalArgumentException().isThrownBy(() ->
                new CatalogItem(UUID.randomUUID(), "valid", "Name", "a".repeat(1001), Instant.EPOCH));
    }
}
