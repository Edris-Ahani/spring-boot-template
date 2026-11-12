package com.acme.platform.catalog.persistence;

import com.acme.platform.catalog.application.CatalogRepository;
import com.acme.platform.catalog.domain.CatalogItem;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Repository;

@Repository
class JpaCatalogRepository implements CatalogRepository {
    private static final Sort NEWEST_FIRST = Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"));
    private final SpringDataCatalogRepository repository;

    JpaCatalogRepository(SpringDataCatalogRepository repository) {
        this.repository = repository;
    }

    @Override
    public CatalogItem save(CatalogItem item) {
        return repository.saveAndFlush(new CatalogItemEntity(item)).toDomain();
    }

    @Override
    public CatalogPage findPage(int page, int size) {
        var result = repository.findAll(PageRequest.of(page, size, NEWEST_FIRST));
        return new CatalogPage(result.getContent().stream().map(CatalogItemEntity::toDomain).toList(),
                result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages());
    }
}
