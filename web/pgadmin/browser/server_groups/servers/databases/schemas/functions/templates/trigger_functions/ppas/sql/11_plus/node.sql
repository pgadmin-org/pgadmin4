SELECT
    pr.oid, pr.proname || '()' AS name,
    lanname, pg_get_userbyid(proowner) AS funcowner, description
FROM
    pg_proc pr
JOIN
    pg_type typ ON typ.oid=prorettype
JOIN
    pg_language lng ON lng.oid=prolang
LEFT OUTER JOIN
    pg_description des ON (des.objoid=pr.oid AND des.classoid='pg_proc'::regclass)
WHERE
    pr.prokind IN ('f', 'w')
{% if fnid %}
    AND pr.oid = {{ fnid|qtLiteral }}
{% endif %}
{% if scid %}
    AND pronamespace = {{scid}}::oid
{% endif %}
    AND typname IN ('trigger', 'event_trigger') AND lanname != 'edbspl'
ORDER BY
    proname;
