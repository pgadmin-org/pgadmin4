{% if scid and foid %}
SELECT
    c.relname AS name, nspname as basensp
FROM
    pg_class c
LEFT OUTER JOIN
    pg_namespace nsp ON (nsp.oid=c.relnamespace)
WHERE
    c.relnamespace = {{scid}}::oid
    AND c.oid = {{foid}}::oid;
{% endif %}

{% if name %}
DROP FOREIGN TABLE {{ conn|qtIdent(basensp, name) }}{% if cascade %} CASCADE{% endif %};
{% endif %}
