{### SQL to fetch directory object properties ###}
SELECT
    dir.oid, 
    dirname AS name, 
    pg_catalog.pg_get_userbyid(dirowner) as diruser,
    dirpath AS path,
    pg_catalog.array_to_string(diracl::text[], ', ') as acl
FROM
    pg_catalog.edb_dir dir
{% if dr_id %}
WHERE dir.oid={{ dr_id|qtLiteral(conn) }}::OID
{% endif %}
ORDER BY name;