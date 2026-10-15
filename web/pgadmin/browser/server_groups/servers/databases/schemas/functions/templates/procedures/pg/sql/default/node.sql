SELECT
    pr.oid,
    CASE WHEN
        ia.args <> ''
    THEN
        pr.proname || '(' || ia.args || ')'
    ELSE
        pr.proname::text
    END AS name,
    lanname, pg_catalog.pg_get_userbyid(proowner) AS funcowner, description
FROM
    pg_catalog.pg_proc pr
JOIN
    pg_catalog.pg_type typ ON typ.oid=prorettype
JOIN
    pg_catalog.pg_language lng ON lng.oid=prolang
CROSS JOIN LATERAL (
    SELECT
{% if schema_diff %}
{#
 # PostgreSQL identifies a procedure by its name and its input (IN, INOUT
 # and VARIADIC) argument types only, so Schema Diff must leave any OUT
 # arguments (allowed from PostgreSQL 14) out of the name it uses to match
 # source and target procedures. Otherwise a procedure whose OUT arguments
 # differ is reported as an unrelated Source Only/Target Only pair, rather
 # than as one changed procedure that has to be dropped and recreated.
 #}
        CASE WHEN 'o' = ANY(pr.proargmodes) THEN COALESCE((
            SELECT pg_catalog.string_agg(
                CASE arg.mode
                    WHEN 'i' THEN 'IN '
                    WHEN 'b' THEN 'INOUT '
                    WHEN 'v' THEN 'VARIADIC '
                    ELSE ''
                END ||
                CASE WHEN COALESCE(arg.name, '') <> ''
                    THEN pg_catalog.quote_ident(arg.name) || ' '
                    ELSE ''
                END ||
                pg_catalog.format_type(arg.type, NULL), ', ' ORDER BY arg.ord)
            FROM ROWS FROM (
                pg_catalog.unnest(pr.proallargtypes),
                pg_catalog.unnest(pr.proargmodes),
                pg_catalog.unnest(pr.proargnames)
            ) WITH ORDINALITY AS arg(type, mode, name, ord)
            WHERE arg.mode NOT IN ('o', 't')
        ), '') ELSE pg_catalog.pg_get_function_identity_arguments(pr.oid) END
{% else %}
        pg_catalog.pg_get_function_identity_arguments(pr.oid)
{% endif %}
        AS args
) ia
LEFT OUTER JOIN
    pg_catalog.pg_description des ON (des.objoid=pr.oid AND des.classoid='pg_proc'::regclass)
WHERE
    pr.prokind = 'p'::char
{% if fnid %}
    AND pr.oid = {{ fnid|qtLiteral(conn) }}
{% endif %}
{% if scid %}
    AND pronamespace = {{scid}}::oid
{% endif %}
{% if schema_diff %}
    AND CASE WHEN (SELECT COUNT(*) FROM pg_catalog.pg_depend
        WHERE objid = pr.oid AND deptype = 'e') > 0 THEN FALSE ELSE TRUE END
{% endif %}
    AND typname NOT IN ('trigger', 'event_trigger')
ORDER BY
    proname;
