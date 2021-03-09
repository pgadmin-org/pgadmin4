SELECT
    name, vartype, min_val, max_val, enumvals
FROM pg_catalog.pg_settings
WHERE context in ('user', 'superuser');
