package com.acme.platform.catalog.persistence;

import com.acme.platform.catalog.domain.CatalogItem;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "catalog_items")
class CatalogItemEntity {
    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 80)
    private String slug;

    @Column(nullable = false, length = 120)
    private String name;

    @Column(nullable = false, length = 1000)
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected CatalogItemEntity() {}

    CatalogItemEntity(CatalogItem item) {
        id = item.id();
        slug = item.slug();
        name = item.name();
        description = item.description();
        createdAt = item.createdAt();
    }

    CatalogItem toDomain() {
        return new CatalogItem(id, slug, name, description, createdAt);
    }
}
