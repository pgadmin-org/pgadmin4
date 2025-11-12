{# SQL query for getting databases #}
SELECT d.datname
    FROM pg_catalog.pg_database d
    ORDER BY 1
