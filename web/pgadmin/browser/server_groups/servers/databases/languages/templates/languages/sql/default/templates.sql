{# ============= SELECT Language templates ============= #}
SELECT
    tmplname
FROM pg_pltemplate
LEFT JOIN pg_language ON tmplname=lanname
WHERE lanname IS NULL
ORDER BY tmplname;