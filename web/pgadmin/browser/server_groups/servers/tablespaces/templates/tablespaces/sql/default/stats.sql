{### SQL to fetch tablespace object stats ###}
{% if tsid %}
SELECT pg_catalog.pg_tablespace_size({{ tsid|qtLiteral(conn) }}::OID) AS {{ conn|qtIdent(_('Size')) }}
{% else %}
SELECT ts.spcname AS {{ conn|qtIdent(_('Name')) }},
    pg_catalog.pg_tablespace_size(ts.oid) AS {{ conn|qtIdent(_('Size')) }}
FROM
    pg_catalog.pg_tablespace ts;
{% endif %}
