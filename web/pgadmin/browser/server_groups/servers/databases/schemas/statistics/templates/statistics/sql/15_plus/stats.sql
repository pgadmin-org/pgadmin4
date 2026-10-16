{### Get statistics for an individual extended statistics object (PG 15+) ###}
SELECT
    s.stxname AS {{ conn|qtIdent(_('Name')) }},
    t.relname AS {{ conn|qtIdent(_('Table')) }},
    (SELECT pg_catalog.string_agg(a.attname, ', ' ORDER BY a.attnum)
     FROM pg_catalog.pg_attribute a
     WHERE a.attrelid = s.stxrelid
       AND a.attnum = ANY(s.stxkeys)
    ) AS {{ conn|qtIdent(_('Columns')) }},
    pg_catalog.pg_get_expr(s.stxexprs, s.stxrelid) AS {{ conn|qtIdent(_('Expressions')) }},
    CASE
        WHEN s.stxkind IS NOT NULL THEN
            pg_catalog.array_to_string(
                ARRAY(
                    SELECT CASE kind
                        WHEN 'd' THEN 'ndistinct'
                        WHEN 'f' THEN 'dependencies'
                        WHEN 'm' THEN 'mcv'
                        WHEN 'e' THEN 'expressions'
                    END
                    FROM pg_catalog.unnest(s.stxkind) AS kind
                ), ', '
            )
        ELSE ''
    END AS {{ conn|qtIdent(_('Statistics Types')) }},
{### The values ANALYZE collected are read through pg_stats_ext, which ###}
{### only shows them to the roles the server allows to see them, and ###}
{### PostgreSQL 15 gave inheritance parents one row per variant ###}
    sd.n_distinct AS {{ conn|qtIdent(_('N-Distinct Coefficients')) }},
    sd.dependencies AS {{ conn|qtIdent(_('Functional Dependencies')) }},
    sd.most_common_vals IS NOT NULL AS {{ conn|qtIdent(_('Has Most Common Values')) }}
FROM pg_catalog.pg_statistic_ext s
    LEFT JOIN pg_catalog.pg_namespace ns ON ns.oid = s.stxnamespace
    LEFT JOIN pg_catalog.pg_class t ON t.oid = s.stxrelid
    LEFT JOIN LATERAL (
        SELECT e.n_distinct, e.dependencies, e.most_common_vals
        FROM pg_catalog.pg_stats_ext e
        WHERE e.statistics_schemaname = ns.nspname
            AND e.statistics_name = s.stxname
        ORDER BY e.inherited
        LIMIT 1
    ) sd ON true
WHERE s.oid = {{stid}}::oid
