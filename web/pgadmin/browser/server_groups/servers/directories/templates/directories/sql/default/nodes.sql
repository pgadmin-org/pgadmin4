SELECT
    dir.oid AS oid,
    dirname AS name,
    dirowner AS owner,
    dirpath AS path
FROM
    pg_catalog.edb_dir dir
{% if dr_id %}
WHERE
    dir.oid={{ dr_id|qtLiteral(conn) }}::OID
{% endif %}
ORDER BY name;