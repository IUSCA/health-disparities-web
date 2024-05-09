CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Run the following command to populate / update the materialized view
-- REFRESH MATERIALIZED view dx_unique_name;
create materialized view if not exists dx_unique_name as
select distinct name from dx;

CREATE INDEX dx_unique_name_name_trgm_idx ON dx_unique_name USING gin ("name" gin_trgm_ops);