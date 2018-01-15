SELECT current_setting('lc_ctype') as cname
UNION
SELECT current_setting('lc_collate') as cname
