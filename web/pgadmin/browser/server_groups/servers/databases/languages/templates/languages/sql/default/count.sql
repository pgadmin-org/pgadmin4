SELECT COUNT(*)
FROM
    pg_catalog.pg_language lan JOIN pg_catalog.pg_proc hp ON hp.oid=lanplcallfoid
WHERE lanispl IS TRUE
