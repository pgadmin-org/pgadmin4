SELECT 'pg_catalog.' || quote_ident(collate_setting.value) AS copy_collation
FROM (
       SELECT setting AS value
       FROM pg_settings
       WHERE name='lc_collate'
     ) collate_setting;
