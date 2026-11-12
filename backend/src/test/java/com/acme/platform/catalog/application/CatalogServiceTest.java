package com.acme.platform.catalog.application;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import com.acme.platform.catalog.domain.CatalogItem;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class CatalogServiceTest {
    private final InMemoryCatalog repository = new InMemoryCatalog();
    private final CatalogService service = new CatalogService(repository,
            Clock.fixed(Instant.parse("2026-11-11T10:00:00Z"), ZoneOffset.UTC));

    @Test
    void createsAnItemThatCanBeReadThroughTheService() {
        var created = service.create("first-item", "First item", "Created through the application");
        assertThat(created.id()).isNotNull();
        assertThat(created.createdAt()).isEqualTo(Instant.parse("2026-11-11T10:00:00Z"));
        assertThat(service.list(0, 12).items()).containsExactly(created);
    }

    @Test
    void rejectsUnboundedPaginationBeforeAccessingPersistence() {
        assertThatIllegalArgumentException().isThrownBy(() -> service.list(0, 51));
        assertThatIllegalArgumentException().isThrownBy(() -> service.list(-1, 10));
        assertThatIllegalArgumentException().isThrownBy(() -> service.list(10001, 10));
    }

    private static final class InMemoryCatalog implements CatalogRepository {
        private final List<CatalogItem> items = new ArrayList<>();

        @Override
        public CatalogItem save(CatalogItem item) {
            items.add(item);
            return item;
        }

        @Override
        public CatalogPage findPage(int page, int size) {
            int start = Math.min(page * size, items.size());
            int end = Math.min(start + size, items.size());
            return new CatalogPage(items.subList(start, end), page, size, items.size(), (items.size() + size - 1) / size);
        }
    }
}
