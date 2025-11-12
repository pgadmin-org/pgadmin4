{# ============= SELECT Language templates ============= #}
SELECT
    tmplname
FROM pg_catalog.pg_pltemplate
LEFT JOIN pg_catalog.pg_language ON tmplname=lanname
WHERE lanname IS NULL
ORDER BY tmplname;
