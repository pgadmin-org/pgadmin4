{# ============= Fetch the base table backing a simple auto-updatable view ============= #}
{# Resolved via pg_depend/pg_rewrite (not information_schema.view_table_usage, #}
{# which is filtered by pg_has_role() on the base table's owner and so misses #}
{# roles that only have direct GRANTs on the view/table, not ownership). #}
WITH base_tables AS (
    SELECT DISTINCT cl.relname, nsp.nspname
    FROM pg_catalog.pg_depend dep
    JOIN pg_catalog.pg_rewrite rw ON rw.oid = dep.objid
    JOIN pg_catalog.pg_class cl ON cl.oid = dep.refobjid
    JOIN pg_catalog.pg_namespace nsp ON nsp.oid = cl.relnamespace
    WHERE rw.ev_class = {{obj_id}}::oid
        AND dep.deptype != 'i'
        AND cl.relkind IN ('r', 'p')
)
SELECT nspname, relname
FROM base_tables
WHERE (SELECT count(*) FROM base_tables) = 1
    AND EXISTS (
        SELECT 1
        FROM information_schema.views v
        WHERE v.table_schema = {{nsp_name|qtLiteral(conn)}}
            AND v.table_name = {{object_name|qtLiteral(conn)}}
            AND v.is_updatable = 'YES'
            AND v.is_trigger_updatable = 'NO'
            AND v.is_trigger_deletable = 'NO'
            AND v.is_trigger_insertable_into = 'NO'
    );
