{### Get statistics for individual statistics object (PostgreSQL 10-11) ###}
SELECT
    s.stxname AS {{ conn|qtIdent(_('Name')) }},
    t.relname AS {{ conn|qtIdent(_('Table')) }},
    (SELECT string_agg(a.attname, ', ' ORDER BY a.attnum)
     FROM pg_catalog.pg_attribute a
     WHERE a.attrelid = s.stxrelid
       AND a.attnum = ANY(s.stxkeys)
    ) AS {{ conn|qtIdent(_('Columns')) }},
    CASE
        WHEN s.stxkind IS NOT NULL THEN
            array_to_string(
                ARRAY(
                    SELECT CASE kind
                        WHEN 'd' THEN 'ndistinct'
                        WHEN 'f' THEN 'dependencies'
                        WHEN 'm' THEN 'mcv'
                    END
                    FROM unnest(s.stxkind) AS kind
                ), ', '
            )
        ELSE ''
    END AS {{ conn|qtIdent(_('Statistics Types')) }},
    NULL AS {{ conn|qtIdent(_('N-Distinct Coefficients')) }},
    NULL AS {{ conn|qtIdent(_('Functional Dependencies')) }},
    NULL AS {{ conn|qtIdent(_('Most Common Values')) }}
FROM pg_catalog.pg_statistic_ext s
    LEFT JOIN pg_catalog.pg_class t ON t.oid = s.stxrelid
WHERE s.oid = {{stid}}::oid
