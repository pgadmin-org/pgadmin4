{# SQL query for getting keywords #}
SELECT upper(word) as word FROM pg_get_keywords()
