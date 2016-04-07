{# FETCH TEXT SEARCH TEMPLATE NAME Statement #}
{% if tid %}
SELECT
    t.tmplname AS name,
    (
    SELECT
        nspname
    FROM
        pg_namespace
    WHERE
        oid = t.tmplnamespace
    ) as schema
FROM
    pg_ts_template t LEFT JOIN pg_description d
    ON d.objoid=t.oid AND d.classoid='pg_ts_template'::regclass
WHERE
    t.oid = {{tid}}::OID;
{% endif %}

{# DROP TEXT SEARCH TEMPLATE Statement #}
{% if schema and name %}
DROP TEXT SEARCH TEMPLATE {{conn|qtIdent(schema)}}.{{conn|qtIdent(name)}} {% if cascade %}CASCADE{%endif%};
{% endif %}