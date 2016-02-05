{### SQL to delete tablespace object ###}
{% if did %}
SELECT spcname
  FROM pg_tablespace ts
  WHERE ts.oid = {{did}}
{% endif %}
{% if tsname %}
DROP TABLESPACE {{ conn|qtIdent(tsname) }};
{% endif %}