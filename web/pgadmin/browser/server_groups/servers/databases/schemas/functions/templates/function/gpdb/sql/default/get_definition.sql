SELECT proretset, prosrc, probin,
  pg_catalog.pg_get_function_arguments(pg_proc.oid) AS funcargs,
  pg_catalog.pg_get_function_identity_arguments(pg_proc.oid) AS funciargs,
  pg_catalog.pg_get_function_result(pg_proc.oid) AS funcresult,
  proiswin, provolatile, proisstrict, prosecdef,
  proconfig, procost, prorows, prodataaccess,
  'a' as proexeclocation,
  (SELECT lanname FROM pg_catalog.pg_language WHERE pg_proc.oid = prolang) as lanname,
  COALESCE(pg_catalog.pg_get_function_identity_arguments(pg_proc.oid), '') AS func_with_identity_arguments,
  nspname,
  proname,
  COALESCE(pg_catalog.pg_get_function_arguments(pg_proc.oid), '') AS func_args
FROM pg_catalog.pg_proc
  JOIN pg_namespace nsp ON nsp.oid=pg_proc.pronamespace
WHERE proisagg = FALSE
  AND pronamespace = {{scid}}::oid
  AND pg_proc.oid = {{fnid}}::oid;
