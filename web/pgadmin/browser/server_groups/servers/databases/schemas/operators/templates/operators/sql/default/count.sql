SELECT COUNT(*)
FROM pg_catalog.pg_operator op
  JOIN pg_catalog.pg_type et on et.oid=op.oprresult
{% if scid %}
  WHERE op.oprnamespace = {{scid}}::oid
{% endif %}
