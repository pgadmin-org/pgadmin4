{# FETCH start functions for FTS_PARSER #}
{% if start %}
SELECT
    proname, nspname
FROM
    pg_proc JOIN pg_namespace n ON n.oid=pronamespace
WHERE
    proargtypes='2281 23'
ORDER BY proname;
{% endif %}

{# FETCH token functions for FTS_PARSER #}
{% if token %}
SELECT
    proname, nspname
FROM
    pg_proc JOIN pg_namespace n ON n.oid=pronamespace
WHERE
    proargtypes='2281 2281 2281'
ORDER BY
    proname;
{% endif %}

{# FETCH end functions for FTS_PARSER #}
{% if end %}
SELECT
    proname, nspname
FROM
    pg_proc JOIN pg_namespace n ON n.oid=pronamespace
WHERE
    prorettype=2278 and proargtypes='2281'
ORDER BY
    proname;
{% endif %}

{# FETCH lextype functions for FTS_PARSER #}
{% if lextype %}
SELECT
    proname, nspname
FROM
    pg_proc JOIN pg_namespace n ON n.oid=pronamespace
WHERE
    prorettype=2281 and proargtypes='2281'
ORDER BY
    proname;
{% endif %}

{# FETCH headline functions for FTS_PARSER #}
{% if headline %}
SELECT
    proname, nspname
FROM
    pg_proc JOIN pg_namespace n ON n.oid=pronamespace
WHERE
    proargtypes='2281 2281 3615'
ORDER BY
    proname;
{% endif %}
