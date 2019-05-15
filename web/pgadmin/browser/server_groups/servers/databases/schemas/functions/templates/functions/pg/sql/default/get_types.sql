SELECT
    *
FROM
    (SELECT
        format_type(t.oid,NULL) AS typname,
        CASE WHEN typelem > 0 THEN typelem ELSE t.oid END as elemoid, typlen, typtype, t.oid, nspname,
        (SELECT COUNT(1) FROM pg_type t2 WHERE t2.typname = t.typname) > 1 AS isdup
    FROM
        pg_type t
    JOIN
        pg_namespace nsp ON typnamespace=nsp.oid
    WHERE
        (NOT (typname = 'unknown' AND nspname = 'pg_catalog'))
    AND
        (
            typtype IN ('b', 'c', 'd', 'e', 'p', 'r')
            AND typname NOT IN ('any', 'trigger', 'language_handler', 'event_trigger')
        )
    ) AS dummy
ORDER BY nspname <> 'pg_catalog', nspname <> 'public', nspname, 1;
