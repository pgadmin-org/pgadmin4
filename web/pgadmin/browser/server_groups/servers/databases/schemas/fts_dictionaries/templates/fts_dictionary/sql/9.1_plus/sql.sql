{# REVERSED ENGINEERED SQL FOR FTS DICTIONARY #}
{% if dcid and scid %}
SELECT
    array_to_string(array_agg(sql), E'\n\n') as sql
FROM
    (
    SELECT
        E'-- Text Search Dictionary: ' || nspname || E'.' || dict.dictname ||
        E'\n\n-- DROP TEXT SEARCH DICTIONARY ' || nspname || E'.' || dict.dictname ||
        E'\n\nCREATE TEXT SEARCH DICTIONARY ' || nspname || E'.' ||  dict.dictname || E' (\n' ||
        E'\tTEMPLATE = ' || template ||
        CASE
            WHEN dict.dictinitoption IS NOT NULL THEN E',\n\t' || dict.dictinitoption
            ELSE ''
        END ||
        E'\n);' ||
        CASE
            WHEN description IS NOT NULL THEN
                E'\n\nCOMMENT ON TEXT SEARCH DICTIONARY ' || nspname || E'.' || dict.dictname ||
                E' IS ' || pg_catalog.quote_literal(description) || E';'
            ELSE ''  END as sql
    FROM
        pg_ts_dict dict
    LEFT JOIN(
        SELECT
            t.tmplname as template,
            t.oid as oid
        FROM
            pg_ts_template t
    ) d on d.oid = dict.dicttemplate
    LEFT JOIN (
        SELECT
            des.description as description,
            des.objoid as descoid
        FROM
            pg_description des
        WHERE
            des.objoid={{dcid}}::OID AND des.classoid='pg_ts_dict'::regclass
    ) a ON (a.descoid = dict.oid)
    LEFT JOIN (
        SELECT
            nspname,
            nsp.oid as noid
        FROM
            pg_namespace nsp
        WHERE
            oid = {{scid}}::OID
    ) b ON (b.noid = dict.dictnamespace)
WHERE
    dict.oid={{dcid}}::OID
) as c;
{% endif %}