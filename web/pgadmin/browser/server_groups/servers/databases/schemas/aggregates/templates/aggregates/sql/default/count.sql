SELECT COUNT(*)
FROM pg_catalog.pg_aggregate ag
  LEFT OUTER JOIN pg_catalog.pg_proc pr ON pr.oid = ag.aggfnoid
WHERE pronamespace = {{scid}}::oid;
