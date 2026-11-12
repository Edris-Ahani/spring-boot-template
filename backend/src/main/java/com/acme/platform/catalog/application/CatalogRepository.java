package com.acme.platform.catalog.application;

import com.acme.platform.catalog.domain.CatalogItem;
import java.util.List;

public interface CatalogRepository {
    CatalogItem save(CatalogItem item);

    CatalogPage findPage(int page, int size);

    record CatalogPage(List<CatalogItem> items, int page, int size, long totalElements, int totalPages) {
        public CatalogPage {
            items = List.copyOf(items);
        }
    }
}
