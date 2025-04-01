SELECT c.oid, c.collname AS name, des.description
FROM pg_catalog.pg_collation c
    LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=c.oid AND des.classoid='pg_collation'::regclass)
{% if scid %}
WHERE c.collnamespace = {{scid}}::oid
{% elif coid %}
WHERE c.oid = {{coid}}::oid
{% endif %}
{% if schema_diff %}
    AND CASE WHEN (SELECT COUNT(*) FROM pg_catalog.pg_depend
        WHERE objid = c.oid AND deptype = 'e') > 0 THEN FALSE ELSE TRUE END
{% endif %}
ORDER BY c.collname;
