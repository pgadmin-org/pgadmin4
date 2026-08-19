{# ============= Fetch the base table backing a simple auto-updatable view ============= #}
SELECT DISTINCT vtu.table_schema AS nspname, vtu.table_name AS relname
FROM information_schema.view_table_usage vtu
WHERE vtu.view_schema = {{nsp_name|qtLiteral(conn)}}
    AND vtu.view_name = {{object_name|qtLiteral(conn)}}
    AND (
        SELECT count(DISTINCT (v2.table_schema, v2.table_name))
        FROM information_schema.view_table_usage v2
        WHERE v2.view_schema = {{nsp_name|qtLiteral(conn)}}
            AND v2.view_name = {{object_name|qtLiteral(conn)}}
    ) = 1
    AND EXISTS (
        SELECT 1
        FROM information_schema.views v
        WHERE v.table_schema = {{nsp_name|qtLiteral(conn)}}
            AND v.table_name = {{object_name|qtLiteral(conn)}}
            AND v.is_updatable = 'YES'
            AND v.is_trigger_updatable = 'NO'
    );
