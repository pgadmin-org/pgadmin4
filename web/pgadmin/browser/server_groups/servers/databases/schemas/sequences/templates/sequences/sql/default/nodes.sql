SELECT cl.oid as oid, relname as name, relnamespace as schema, description as comment
FROM pg_catalog.pg_class cl
LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=cl.oid
    AND des.classoid='pg_class'::regclass)
{% if show_internal %}
LEFT JOIN pg_catalog.pg_depend d1 ON d1.refobjid = cl.oid AND d1.deptype = 'i'
{% endif %}
WHERE
    relkind = 'S'
{% if scid %}
    AND relnamespace = {{scid|qtLiteral(conn)}}::oid
{% endif %}
{% if seid %}
    AND cl.oid = {{seid|qtLiteral(conn)}}::oid
{% endif %}
{% if schema_diff %}
    AND CASE WHEN (SELECT COUNT(*) FROM pg_catalog.pg_depend
        WHERE objid = cl.oid AND deptype = 'e') > 0 THEN FALSE ELSE TRUE END
{% endif %}
ORDER BY relname
