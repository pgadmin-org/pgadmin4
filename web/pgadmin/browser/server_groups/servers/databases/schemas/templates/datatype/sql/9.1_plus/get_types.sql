SELECT
    *
FROM
    (SELECT
        format_type(t.oid,NULL) AS typname,
        CASE WHEN typelem > 0 THEN typelem ELSE t.oid END as elemoid,
        typlen, typtype, t.oid, nspname,
        (SELECT COUNT(1) FROM pg_type t2 WHERE t2.typname = t.typname) > 1 AS isdup,
        CASE WHEN t.typcollation != 0 THEN TRUE ELSE FALSE END AS is_collatable
    FROM
        pg_type t
    JOIN
        pg_namespace nsp ON typnamespace=nsp.oid
    WHERE
        (NOT (typname = 'unknown' AND nspname = 'pg_catalog'))
    AND
        {{ condition }}
    ) AS dummy
ORDER BY nspname <> 'pg_catalog', nspname <> 'public', nspname, 1