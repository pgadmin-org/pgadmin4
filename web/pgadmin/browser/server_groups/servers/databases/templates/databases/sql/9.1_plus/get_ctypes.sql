SELECT DISTINCT(datctype) AS cname
FROM pg_catalog.pg_database
UNION
SELECT DISTINCT(datcollate) AS cname
FROM pg_catalog.pg_database
