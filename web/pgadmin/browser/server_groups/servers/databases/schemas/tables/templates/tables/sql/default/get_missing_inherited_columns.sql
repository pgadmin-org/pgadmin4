{### Columns of the given parents that the table does not have yet ###}
SELECT name, displaytypname, collspcname, attnotnull FROM (
    SELECT DISTINCT ON (a.attname) a.attname AS name,
        pg_catalog.format_type(a.atttypid, a.atttypmod) AS displaytypname,
        CASE WHEN a.attcollation <> ty.typcollation THEN
            pg_catalog.quote_ident(cn.nspname)||'.'||pg_catalog.quote_ident(co.collname)
        END AS collspcname,
        a.attnotnull, p.ord, a.attnum
    FROM
        pg_catalog.unnest(ARRAY[{% for val in parents %}{{val|qtLiteral(conn)}}::regclass::oid{% if not loop.last %}, {% endif %}{% endfor %}])
            WITH ORDINALITY AS p(oid, ord)
    JOIN
        pg_catalog.pg_attribute a ON a.attrelid = p.oid AND a.attnum > 0 AND NOT a.attisdropped
    JOIN
        pg_catalog.pg_type ty ON ty.oid = a.atttypid
    LEFT OUTER JOIN
        pg_catalog.pg_collation co ON co.oid = a.attcollation
    LEFT OUTER JOIN
        pg_catalog.pg_namespace cn ON cn.oid = co.collnamespace
    WHERE NOT EXISTS (
        SELECT 1 FROM pg_catalog.pg_attribute ca
        WHERE ca.attrelid = {{tid}}::oid AND ca.attname = a.attname
            AND ca.attnum > 0 AND NOT ca.attisdropped)
    ORDER BY a.attname, p.ord, a.attnum
) cols
ORDER BY ord, attnum
