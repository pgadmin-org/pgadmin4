{% for n in range(colcnt|int) %}
{% if loop.index != 1 %}
UNION
{% endif %}
SELECT
  i.indoption[{{loop.index -1}}] AS options,
  pg_catalog.pg_get_indexdef(i.indexrelid, {{loop.index}}, true) AS coldef,
  op.oprname,
  CASE WHEN (o.opcdefault = FALSE) THEN o.opcname ELSE null END AS opcname
,
  coll.collname,
  nspc.nspname as collnspname,
  pg_catalog.format_type(ty.oid,NULL) AS datatype,
  CASE WHEN pg_catalog.pg_get_indexdef(i.indexrelid, {{loop.index}}, true) = a.attname THEN FALSE ELSE TRUE END AS is_exp
FROM pg_catalog.pg_index i
JOIN pg_catalog.pg_attribute a ON (a.attrelid = i.indexrelid AND attnum = {{loop.index}})
JOIN pg_catalog.pg_type ty ON ty.oid=a.atttypid
LEFT OUTER JOIN pg_catalog.pg_opclass o ON (o.oid = i.indclass[{{loop.index -1}}])
LEFT OUTER JOIN pg_catalog.pg_constraint c ON (c.conindid = i.indexrelid) LEFT OUTER JOIN pg_catalog.pg_operator op ON (op.oid = c.conexclop[{{loop.index}}])
LEFT OUTER JOIN pg_catalog.pg_collation coll ON a.attcollation=coll.oid
LEFT OUTER JOIN pg_catalog.pg_namespace nspc ON coll.collnamespace=nspc.oid
WHERE i.indexrelid = {{cid}}::oid
{% endfor %}
