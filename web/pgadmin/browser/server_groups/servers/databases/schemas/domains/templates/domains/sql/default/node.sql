SELECT
    d.oid, d.typname as name, pg_catalog.pg_get_userbyid(d.typowner) as owner,
    bn.nspname as basensp, des.description
FROM
    pg_catalog.pg_type d
JOIN
    pg_catalog.pg_type b ON b.oid = d.typbasetype
JOIN
    pg_catalog.pg_namespace bn ON bn.oid=d.typnamespace
LEFT OUTER JOIN
    pg_catalog.pg_description des ON (des.objoid=d.oid AND des.classoid='pg_type'::regclass)
{% if scid is defined %}
WHERE
    d.typnamespace = {{scid}}::oid
{% elif doid %}
WHERE d.oid = {{doid}}::oid
{% endif %}
{% if schema_diff %}
    AND CASE WHEN (SELECT COUNT(*) FROM pg_catalog.pg_depend
        WHERE objid = d.oid AND deptype = 'e') > 0 THEN FALSE ELSE TRUE END
{% endif %}
ORDER BY
    d.typname;
