package com.acme.platform.catalog.persistence;

import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

interface SpringDataCatalogRepository extends JpaRepository<CatalogItemEntity, UUID> {}
