SELECT
    *
FROM (
    SELECT 
        format_type(t.oid,NULL) AS typname,
        CASE
            WHEN typelem > 0 THEN typelem
            ELSE t.oid
        END as elemoid,
        typlen,
        typtype,
        t.oid,
        nspname,
        (SELECT COUNT(1) FROM pg_type t2 WHERE t2.typname = t.typname) > 1 AS isdup
    FROM
        pg_type t
        JOIN pg_namespace nsp ON typnamespace=nsp.oid
    WHERE
        (NOT (typname = 'unknown'
        AND nspname = 'pg_catalog'))
        AND typisdefined
        AND typtype IN ('b', 'c', 'e', 'r')
        AND NOT EXISTS (
            SELECT
                1
            FROM
                 pg_class
            WHERE
                 relnamespace = typnamespace
                 AND relname = typname
                 AND relkind != 'c')
                 AND (typname NOT LIKE '_%'
                     OR NOT EXISTS (
                         SELECT
                             1
                         FROM
                              pg_class
                         WHERE
                             relnamespace = typnamespace
                             AND relname = SUBSTRING(typname FROM 2)::name
                             AND relkind != 'c'
                     )
                 )
                 AND nsp.nspname != 'information_schema' ) AS dummy
             ORDER BY
                 nspname <> 'pg_catalog', nspname <> 'public', nspname, 1
