{### SQL to fetch tablespace object properties ###}
SELECT ts.oid, spcname AS name, spclocation, spcoptions, pg_get_userbyid(spcowner) as spcuser, spcacl,
pg_catalog.shobj_description(oid, 'pg_tablespace') AS description
FROM pg_tablespace ts
{% if did %}
WHERE ts.oid={{did}}::int
{% endif %}
ORDER BY name