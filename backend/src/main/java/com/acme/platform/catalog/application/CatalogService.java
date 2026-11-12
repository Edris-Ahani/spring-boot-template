package com.acme.platform.catalog.application;

import com.acme.platform.catalog.domain.CatalogItem;
import java.time.Clock;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CatalogService {
    private final CatalogRepository repository;
    private final Clock clock;

    public CatalogService(CatalogRepository repository, Clock clock) {
        this.repository = repository;
        this.clock = clock;
    }

    public CatalogRepository.CatalogPage list(int page, int size) {
        if (page < 0 || page > 10000 || size < 1 || size > 50) {
            throw new IllegalArgumentException("Pagination is outside the supported range");
        }
        return repository.findPage(page, size);
    }

    @Transactional
    public CatalogItem create(String slug, String name, String description) {
        return repository.save(new CatalogItem(UUID.randomUUID(), slug, name, description, clock.instant()));
    }
}
