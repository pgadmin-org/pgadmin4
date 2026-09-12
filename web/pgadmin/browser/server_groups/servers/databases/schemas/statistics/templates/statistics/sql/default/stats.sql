{### Get statistics for an individual extended statistics object ###}
SELECT
    s.stxname AS {{ conn|qtIdent(_('Name')) }},
    t.relname AS {{ conn|qtIdent(_('Table')) }},
    (SELECT string_agg(a.attname, ', ' ORDER BY a.attnum)
     FROM pg_catalog.pg_attribute a
     WHERE a.attrelid = s.stxrelid
       AND a.attnum = ANY(s.stxkeys)
    ) AS {{ conn|qtIdent(_('Columns')) }},
    pg_catalog.pg_get_expr(s.stxexprs, s.stxrelid) AS {{ conn|qtIdent(_('Expressions')) }},
    CASE
        WHEN s.stxkind IS NOT NULL THEN
            array_to_string(
                ARRAY(
                    SELECT CASE kind
                        WHEN 'd' THEN 'ndistinct'
                        WHEN 'f' THEN 'dependencies'
                        WHEN 'm' THEN 'mcv'
                        WHEN 'e' THEN 'expressions'
                    END
                    FROM unnest(s.stxkind) AS kind
                ), ', '
            )
        ELSE ''
    END AS {{ conn|qtIdent(_('Statistics Types')) }}
{### The values ANALYZE collected live in pg_statistic_ext_data, which ###}
{### only a superuser may read ###}
{% if has_ext_data_access %}
    ,sd.stxdndistinct AS {{ conn|qtIdent(_('N-Distinct Coefficients')) }},
    sd.stxddependencies AS {{ conn|qtIdent(_('Functional Dependencies')) }},
    CASE WHEN sd.stxdmcv IS NOT NULL THEN true ELSE false END AS {{ conn|qtIdent(_('Has Most Common Values')) }}
{% endif %}
FROM pg_catalog.pg_statistic_ext s
    LEFT JOIN pg_catalog.pg_class t ON t.oid = s.stxrelid
{% if has_ext_data_access %}
    LEFT JOIN pg_catalog.pg_statistic_ext_data sd ON sd.stxoid = s.oid
{% endif %}
WHERE s.oid = {{stid}}::oid
