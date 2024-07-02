SELECT
  setting
FROM
  pg_show_all_settings()
WHERE
  name='log_destination'
