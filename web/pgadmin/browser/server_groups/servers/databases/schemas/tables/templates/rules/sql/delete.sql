{# ======== Drop/Cascade Rule ========= #}
{% if rid %}
SELECT
    rw.rulename,
    cl.relname,
    nsp.nspname
FROM
    pg_rewrite rw
JOIN pg_class cl ON cl.oid=rw.ev_class
JOIN pg_namespace nsp ON nsp.oid=cl.relnamespace
WHERE
    rw.oid={{ rid }};
{% endif %}
{% if rulename and relname and nspname %}
DROP RULE {{ conn|qtIdent(rulename) }} ON {{ conn|qtIdent(nspname, relname) }} {% if cascade %} CASCADE {% endif %};
{% endif %}
