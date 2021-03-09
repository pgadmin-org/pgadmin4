  SELECT rl.*, r.rolname AS user_name, db.datname as db_name
FROM pg_catalog.pg_db_role_setting AS rl
 LEFT JOIN pg_catalog.pg_roles AS r ON rl.setrole = r.oid
 LEFT JOIN pg_catalog.pg_database AS db ON rl.setdatabase = db.oid
WHERE setdatabase = {{did}}
