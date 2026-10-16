SELECT
    pr.oid,
{% if schema_diff %}
{#
 # Schema Diff shows this name as the function's title. It lists the
 # input (IN, INOUT and VARIADIC) arguments only, which are what identify
 # the function, and leaves out any OUT arguments.
 #}
    pr.proname || '(' || CASE WHEN 'o' = ANY(pr.proargmodes) THEN COALESCE((
        SELECT pg_catalog.string_agg(
            CASE arg.mode
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
    ), '') ELSE COALESCE(pg_catalog.pg_get_function_identity_arguments(pr.oid), '') END || ')' as name,
{% else %}
    pr.proname || '(' || COALESCE(pg_catalog.pg_get_function_identity_arguments(pr.oid), '') || ')' as name,
{% endif %}
{% if schema_diff %}
{#
 # Schema Diff matches source and target functions on this key rather than
 # on the name above, which includes argument names and is only used for
 # display. PostgreSQL identifies a function by its name and input
 # argument types alone, so a function whose argument names differ is
 # still the same function, to be dropped and recreated.
 #}
    pr.proname || '(' || pg_catalog.oidvectortypes(pr.proargtypes) || ')' AS diff_key,
{% endif %}
    lanname, pg_catalog.pg_get_userbyid(proowner) as funcowner, description
FROM
    pg_catalog.pg_proc pr
JOIN
    pg_catalog.pg_type typ ON typ.oid=prorettype
JOIN
    pg_catalog.pg_language lng ON lng.oid=prolang
LEFT OUTER JOIN
    pg_catalog.pg_description des ON (des.objoid=pr.oid AND des.classoid='pg_proc'::regclass)
WHERE
   pr.prokind IN ('f', 'w')
{% if fnid %}
    AND pr.oid = {{ fnid|qtLiteral(conn) }}
{% endif %}
{% if scid %}
    AND pronamespace = {{scid}}::oid
{% endif %}
{% if schema_diff %}
    AND CASE WHEN (SELECT COUNT(*) FROM pg_catalog.pg_depend
        WHERE objid = pr.oid AND deptype IN ('e', 'i')) > 0 THEN FALSE ELSE TRUE END
{% endif %}
    AND typname NOT IN ('trigger', 'event_trigger')
ORDER BY
    proname;
