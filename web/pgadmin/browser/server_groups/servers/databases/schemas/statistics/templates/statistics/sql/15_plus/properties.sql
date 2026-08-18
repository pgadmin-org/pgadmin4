{### Query extended statistics properties from pg_statistic_ext (PostgreSQL 15+) ###}
{% if scid %}
SELECT
    s.oid,
    s.stxname AS name,
    s.stxnamespace AS schemaoid,
    ns.nspname AS schema,
    s.stxrelid AS tableoid,
    t.relname AS table,
    pg_catalog.pg_get_userbyid(s.stxowner) AS owner,
    s.stxkeys AS column_attnums,
    (SELECT array_agg(a.attname ORDER BY a.attnum)
     FROM pg_catalog.pg_attribute a
     WHERE a.attrelid = s.stxrelid
       AND a.attnum = ANY(s.stxkeys)
    ) AS columns,
    s.stxkind AS stat_types_raw,
    CASE WHEN 'd' = ANY(s.stxkind) THEN true ELSE false END AS has_ndistinct,
    CASE WHEN 'f' = ANY(s.stxkind) THEN true ELSE false END AS has_dependencies,
    CASE WHEN 'm' = ANY(s.stxkind) THEN true ELSE false END AS has_mcv,
    s.stxstattarget AS stattarget,
{### stxexprs added in PostgreSQL 14 for expression statistics ###}
    pg_catalog.pg_get_expr(s.stxexprs, s.stxrelid) AS expression_list,
{### pg_statistic_ext_data is readable by superusers only, so the data ###}
{### ANALYZE collected is only selected when we are allowed to read it ###}
{% if has_ext_data_access %}
    sd.stxdndistinct AS ndistinct_values,
    sd.stxddependencies AS dependencies_values,
    CASE WHEN sd.stxdmcv IS NOT NULL THEN true ELSE false END AS has_mcv_values,
{% endif %}
    des.description AS comment
FROM pg_catalog.pg_statistic_ext s
    LEFT JOIN pg_catalog.pg_namespace ns ON ns.oid = s.stxnamespace
    LEFT JOIN pg_catalog.pg_class t ON t.oid = s.stxrelid
{### PostgreSQL 15 added stxdinherit, so an inheritance parent has a row ###}
{### per variant and a plain join would list the object twice; prefer the ###}
{### non-inherited row, falling back to the inherited one, which is all a ###}
{### partitioned parent has ###}
{% if has_ext_data_access %}
    LEFT JOIN LATERAL (
        SELECT d.stxdndistinct, d.stxddependencies, d.stxdmcv
        FROM pg_catalog.pg_statistic_ext_data d
        WHERE d.stxoid = s.oid
        ORDER BY d.stxdinherit
        LIMIT 1
    ) sd ON true
{% endif %}
    LEFT OUTER JOIN pg_catalog.pg_description des
        ON (des.objoid = s.oid AND des.classoid = 'pg_statistic_ext'::regclass)
WHERE s.stxnamespace = {{scid}}::oid
{% if stid %}
    AND s.oid = {{stid}}::oid
{% endif %}
ORDER BY s.stxname
{% endif %}
