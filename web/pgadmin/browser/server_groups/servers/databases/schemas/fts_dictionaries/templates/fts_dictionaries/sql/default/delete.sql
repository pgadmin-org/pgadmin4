{# FETCH FTS DICTIONARY NAME Statement #}
{% if dcid %}
SELECT
    dict.dictname as name,
    (
    SELECT
        nspname
    FROM
        pg_catalog.pg_namespace
    WHERE
        oid = dict.dictnamespace
    ) as schema
FROM
    pg_catalog.pg_ts_dict dict LEFT OUTER JOIN pg_catalog.pg_description des
    ON (des.objoid=dict.oid AND des.classoid='pg_ts_dict'::regclass)
WHERE
    dict.oid = {{dcid}}::OID;
{% endif %}

{# DROP FTS DICTIOANRY Statement #}
{% if schema and name %}
DROP TEXT SEARCH DICTIONARY {{conn|qtIdent(schema)}}.{{conn|qtIdent(name)}} {% if cascade %}CASCADE{%endif%};
{% endif %}
