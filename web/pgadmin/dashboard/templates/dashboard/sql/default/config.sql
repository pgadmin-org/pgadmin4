SELECT
    name,
    category,
    setting,
    unit,
    short_desc
FROM
    pg_settings
ORDER BY
    category