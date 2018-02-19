SELECT
    *
FROM
    (SELECT
        format_type(t.oid,NULL) AS typname,
        CASE WHEN typelem > 0 THEN typelem ELSE t.oid END as elemoid,
        typlen, typtype, t.oid, nspname,
        (SELECT COUNT(1) FROM pg_type t2 WHERE t2.typname = t.typname) > 1 AS isdup,
        FALSE  AS is_collatable
    FROM
        pg_type t
    JOIN
        pg_namespace nsp ON typnamespace=nsp.oid
    WHERE
        (NOT (typname = 'unknown' AND nspname = 'pg_catalog'))
    AND
        {{ condition }}
    AND (
      typnamespace = {{ schema_oid }}::oid
      OR nsp.nspname = 'pg_catalog'
    )
{% if add_serials %}
{# Here we will add serials types manually #}
    UNION SELECT 'smallserial', 0, 2, 'b', 0, 'pg_catalog', false, false
    UNION SELECT 'bigserial', 0, 8, 'b', 0, 'pg_catalog', false, false
    UNION SELECT 'serial', 0, 4, 'b', 0, 'pg_catalog', false, false
{% endif %}) AS dummy
ORDER BY nspname <> 'pg_catalog', nspname <> 'public', nspname, 1
