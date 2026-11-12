CREATE TABLE catalog_items (
    id UUID PRIMARY KEY,
    slug VARCHAR(80) NOT NULL,
    name VARCHAR(120) NOT NULL,
    description VARCHAR(1000) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL,
    CONSTRAINT catalog_items_slug_key UNIQUE (slug),
    CONSTRAINT catalog_items_slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
    CONSTRAINT catalog_items_name_not_blank CHECK (length(trim(name)) > 0)
);

CREATE INDEX catalog_items_created_at_id_idx ON catalog_items (created_at DESC, id DESC);
