SELECT
    pr.oid,
    CASE WHEN
        pg_catalog.pg_get_function_identity_arguments(pr.oid) <> ''
    THEN
        pr.proname || '(' || pg_catalog.pg_get_function_identity_arguments(pr.oid) || ')'
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
LEFT OUTER JOIN
    pg_catalog.pg_description des ON (des.objoid=pr.oid AND des.classoid='pg_proc'::regclass)
WHERE
    proisagg = FALSE
    AND pr.protype = '1'::char
{% if fnid %}
    AND pr.oid = {{ fnid|qtLiteral }}
{% endif %}
{% if scid %}
    AND pronamespace = {{scid}}::oid
{% endif %}
    AND typname NOT IN ('trigger', 'event_trigger')
ORDER BY
    proname;
