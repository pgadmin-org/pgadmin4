SELECT aggfnoid::oid as oid,
  proname || '(' || COALESCE(pg_catalog.pg_get_function_arguments(aggfnoid::oid), '') || ')' AS name,
  pg_catalog.pg_get_userbyid(proowner) AS owner,
  description
FROM pg_aggregate ag
  LEFT OUTER JOIN pg_catalog.pg_proc pr ON pr.oid = ag.aggfnoid
  LEFT OUTER JOIN pg_catalog.pg_type tt on tt.oid=aggtranstype
  LEFT OUTER JOIN pg_catalog.pg_type tf on tf.oid=prorettype
  LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=aggfnoid::oid AND des.classoid='pg_aggregate'::regclass)
{% if scid %}
  WHERE pronamespace = {{scid}}::oid
{% elif agid %}
  WHERE ag.aggfnoid = {{agid}}::oid
{% endif %}
ORDER BY name;
