{### SQL to fetch tablespace object properties ###}
SELECT ts.oid, spcname AS name, pg_catalog.pg_tablespace_location(ts.oid) AS spclocation, spcoptions,
pg_get_userbyid(spcowner) as spcuser, spcacl::text[],
pg_catalog.shobj_description(oid, 'pg_tablespace') AS description
,(SELECT array_agg(provider || '=' || label) FROM pg_shseclabel sl1 WHERE sl1.objoid=ts.oid) AS seclabels
FROM pg_tablespace ts
{% if did %}
WHERE ts.oid={{did}}::int
{% endif %}
ORDER BY name