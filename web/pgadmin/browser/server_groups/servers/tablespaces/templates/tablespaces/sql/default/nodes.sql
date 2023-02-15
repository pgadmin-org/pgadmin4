SELECT
    ts.oid AS oid, spcname AS name, spcowner as owner
FROM
    pg_catalog.pg_tablespace ts
{% if tsid %}
WHERE
    ts.oid={{ tsid|qtLiteral(conn) }}::OID
{% endif %}
ORDER BY name;
