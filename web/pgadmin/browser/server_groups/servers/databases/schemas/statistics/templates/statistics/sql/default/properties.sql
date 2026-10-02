{### Query extended statistics properties from pg_statistic_ext (PostgreSQL 14+) ###}
{% if scid %}
SELECT
    s.oid,
    s.stxname AS name,
    s.stxnamespace AS schemaoid,
    ns.nspname AS schema,
    s.stxrelid AS tableoid,
    t.relname AS table,
{### The table need not be in the statistics object's own schema ###}
    tn.nspname AS table_schema,
    pg_catalog.pg_get_userbyid(s.stxowner) AS owner,
    s.stxkeys AS column_attnums,
    (SELECT pg_catalog.array_agg(a.attname ORDER BY a.attnum)
     FROM pg_catalog.pg_attribute a
     WHERE a.attrelid = s.stxrelid
       AND a.attnum = ANY(s.stxkeys)
    ) AS columns,
    s.stxkind AS stat_types_raw,
    CASE WHEN 'd' = ANY(s.stxkind) THEN true ELSE false END AS has_ndistinct,
    CASE WHEN 'f' = ANY(s.stxkind) THEN true ELSE false END AS has_dependencies,
    CASE WHEN 'm' = ANY(s.stxkind) THEN true ELSE false END AS has_mcv,
    s.stxstattarget AS stattarget,
{### stxexprs added in PostgreSQL 14 for expression statistics. The ###}
{### deparsed expressions may lack the parentheses CREATE STATISTICS ###}
{### needs, as with (a)::text or a CASE, so wrap each one of them ###}
    (SELECT pg_catalog.string_agg('(' || e.expr || ')', ', ' ORDER BY e.ord)
     FROM pg_catalog.unnest(
         pg_catalog.pg_get_statisticsobjdef_expressions(s.oid)
     ) WITH ORDINALITY AS e(expr, ord)
    ) AS expression_list,
{### The data ANALYZE collected is read through pg_stats_ext, which only ###}
{### shows it to the roles the server allows to see it. When there is no ###}
{### row we cannot tell a role without access from an object that has ###}
{### not been analysed, so only claim access for the table's owners ###}
    (sd.statistics_name IS NOT NULL OR
     pg_catalog.pg_has_role(t.relowner, 'USAGE')) AS has_ext_data_access,
    sd.n_distinct AS ndistinct_values,
    sd.dependencies AS dependencies_values,
    sd.most_common_vals IS NOT NULL AS has_mcv_values,
    des.description AS comment
FROM pg_catalog.pg_statistic_ext s
    LEFT JOIN pg_catalog.pg_namespace ns ON ns.oid = s.stxnamespace
    LEFT JOIN pg_catalog.pg_class t ON t.oid = s.stxrelid
    LEFT JOIN pg_catalog.pg_namespace tn ON tn.oid = t.relnamespace
    LEFT JOIN pg_catalog.pg_stats_ext sd
        ON sd.statistics_schemaname = ns.nspname
        AND sd.statistics_name = s.stxname
    LEFT OUTER JOIN pg_catalog.pg_description des
        ON (des.objoid = s.oid AND des.classoid = 'pg_statistic_ext'::regclass)
WHERE s.stxnamespace = {{scid}}::oid
{% if stid %}
    AND s.oid = {{stid}}::oid
{% endif %}
ORDER BY s.stxname
{% endif %}
