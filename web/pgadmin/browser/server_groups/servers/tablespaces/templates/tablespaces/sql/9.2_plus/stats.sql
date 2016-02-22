{### SQL to fetch tablespace object stats ###}
{% if tsid %}
SELECT pg_size_pretty(pg_tablespace_size({{ qtLiteral(tsid) }}::OID)) AS size
{% else %}
SELECT ts.spcname as name, pg_size_pretty(pg_tablespace_size(ts.oid)) AS size FROM pg_catalog.pg_tablespace ts;
{% endif %}
