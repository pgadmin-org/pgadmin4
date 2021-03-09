SELECT
    ts.oid, spcname AS name, spcowner as owner
FROM
    pg_catalog.pg_tablespace ts
{% if tsid %}
WHERE
    ts.oid={{ tsid|qtLiteral }}::OID
{% endif %}
ORDER BY name;
