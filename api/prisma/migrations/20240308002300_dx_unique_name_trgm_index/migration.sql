CREATE EXTENSION IF NOT EXISTS pg_trgm;

create materialized view if not exists dx_unique_name as
select distinct name from dx;

CREATE INDEX dx_unique_name_name_trgm_idx ON dx_unique_name USING gin ("name" gin_trgm_ops);