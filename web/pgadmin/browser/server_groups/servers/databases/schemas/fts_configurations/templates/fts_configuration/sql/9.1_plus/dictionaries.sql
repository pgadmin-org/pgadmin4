{# FETCH DICTIONARIES statement #}
SELECT
    dictname
FROM
    pg_ts_dict
ORDER BY
    dictname