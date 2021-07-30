{# ======== Drop/Cascade Rule ========= #}
{% if rid %}
SELECT
    rw.rulename,
    cl.relname,
    nsp.nspname
FROM
    pg_catalog.pg_rewrite rw
JOIN pg_catalog.pg_class cl ON cl.oid=rw.ev_class
JOIN pg_catalog.pg_namespace nsp ON nsp.oid=cl.relnamespace
WHERE
    rw.oid={{ rid }};
{% endif %}
{% if rulename and relname and nspname %}
DROP RULE IF EXISTS {{ conn|qtIdent(rulename) }} ON {{ conn|qtIdent(nspname, relname) }} {% if cascade %} CASCADE {% endif %};
{% endif %}
