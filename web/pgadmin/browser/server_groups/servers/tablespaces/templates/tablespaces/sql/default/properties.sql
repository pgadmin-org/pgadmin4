{### SQL to fetch tablespace object properties ###}
SELECT
    ts.oid, spcname AS name, spclocation, spcoptions,
    pg_catalog.pg_get_userbyid(spcowner) as spcuser,
    pg_catalog.shobj_description(oid, 'pg_tablespace') AS description,
    pg_catalog.array_to_string(spcacl::text[], ', ') as acl
FROM
    pg_catalog.pg_tablespace ts
{% if tsid %}
WHERE ts.oid={{ tsid|qtLiteral }}::OID
{% endif %}
ORDER BY name
