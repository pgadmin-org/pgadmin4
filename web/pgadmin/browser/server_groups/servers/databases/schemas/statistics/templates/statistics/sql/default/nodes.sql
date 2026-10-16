{### List statistics objects for tree view ###}
SELECT
    s.oid,
    s.stxname AS name,
    s.stxnamespace AS schemaoid,
    des.description AS comment
FROM pg_catalog.pg_statistic_ext s
    LEFT OUTER JOIN pg_catalog.pg_description des
        ON (des.objoid = s.oid AND des.classoid = 'pg_statistic_ext'::regclass)
{### Without scid, as after an update that may have moved the object to ###}
{### another schema, the object is looked up by its OID alone ###}
WHERE {% if scid %}s.stxnamespace = {{scid}}::oid{% else %}true{% endif %}
{% if stid %}
    AND s.oid = {{stid}}::oid
{% endif %}
{% if schema_diff %}
    AND CASE WHEN (SELECT COUNT(*) FROM pg_catalog.pg_depend
        WHERE objid = s.oid AND deptype = 'e') > 0 THEN FALSE ELSE TRUE END
{% endif %}
ORDER BY s.stxname
