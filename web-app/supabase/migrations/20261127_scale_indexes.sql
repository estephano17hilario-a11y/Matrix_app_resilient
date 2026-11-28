-- 2026-11-27 · Scale: drop the unused GIN index on user_collections.data.
-- It had 0 scans (the only query that could use it, a legacy `data @> {id}` fallback in the client,
-- was removed) but was the biggest structure of the table (840 kB of 2.6 MB) and made every write
-- re-index the whole JSON document. Clients now sync by (user_id, updated_at), which uses
-- idx_user_collections_updated. Reversible:
--   CREATE INDEX CONCURRENTLY idx_user_collections_gin_data ON public.user_collections USING gin (data);
DROP INDEX CONCURRENTLY IF EXISTS public.idx_user_collections_gin_data;
