/*pga4dash*/
SELECT
    name,
    category,
    setting,
    unit,
    short_desc
FROM
    pg_catalog.pg_show_all_settings()
ORDER BY
    category
