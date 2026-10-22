{### Columns of the given parents that the table must have before it can inherit from them: ###}
{### the ones it does not have yet, and the ones it has without the NOT NULL a parent requires ###}
SELECT name, displaytypname, collspcname, attnotnull, genexpr, is_missing FROM (
    SELECT DISTINCT ON (a.attname) a.attname AS name,
        pg_catalog.format_type(a.atttypid, a.atttypmod) AS displaytypname,
        CASE WHEN a.attcollation <> ty.typcollation THEN
            pg_catalog.quote_ident(cn.nspname)||'.'||pg_catalog.quote_ident(co.collname)
        END AS collspcname,
        pg_catalog.bool_or(a.attnotnull) OVER (PARTITION BY a.attname) AS attnotnull,
        CASE WHEN a.attgenerated = 's' THEN
            pg_catalog.pg_get_expr(def.adbin, def.adrelid)
        END AS genexpr,
        ca.attname IS NULL AS is_missing, ca.attnotnull AS child_attnotnull,
        p.ord, a.attnum
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
    LEFT OUTER JOIN
        pg_catalog.pg_attrdef def ON def.adrelid = a.attrelid AND def.adnum = a.attnum
    LEFT OUTER JOIN
        pg_catalog.pg_attribute ca ON ca.attrelid = {{tid}}::oid AND ca.attname = a.attname
            AND ca.attnum > 0 AND NOT ca.attisdropped
    ORDER BY a.attname, p.ord, a.attnum
) cols
WHERE is_missing OR (attnotnull AND NOT child_attnotnull)
{### Generated columns go last, as their expressions use the other columns ###}
ORDER BY genexpr IS NOT NULL, ord, attnum
