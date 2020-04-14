{# Reverse engineered sql for FTS PARSER #}
{% if pid and scid %}
SELECT
    array_to_string(array_agg(sql), E'\n\n') as sql
FROM
    (
    SELECT
        E'-- Text Search Parser: ' || quote_ident(nspname) || E'.' || prs.prsname ||
        E'\n\n-- DROP TEXT SEARCH PARSER ' || quote_ident(nspname) || E'.' || quote_ident(prs.prsname) ||
        E'\n\nCREATE TEXT SEARCH PARSER ' || quote_ident(nspname) || E'.' || quote_ident(prs.prsname) || E' (\n' ||
        E'    START = ' || prs.prsstart || E',\n' ||
        E'    GETTOKEN = ' || prs.prstoken || E',\n' ||
        E'    END = ' || prs.prsend || E',\n' ||
        E'    LEXTYPES = ' || prs.prslextype ||
        CASE
            WHEN prs.prsheadline != '-'::regclass THEN E',\n    HEADLINE = ' || prs.prsheadline
            ELSE '' END || E'\n);' ||
        CASE
            WHEN description IS NOT NULL THEN
                E'\n\nCOMMENT ON TEXT SEARCH PARSER ' || quote_ident(nspname) || E'.' || quote_ident(prs.prsname) ||
                E' IS ' || pg_catalog.quote_literal(description) || E';'
            ELSE ''  END as sql
    FROM
        pg_ts_parser prs
    LEFT JOIN (
        SELECT
            des.description as description,
            des.objoid as descoid
        FROM
            pg_description des
        WHERE
            des.objoid={{pid}}::OID AND des.classoid='pg_ts_parser'::regclass
    ) a ON (a.descoid = prs.oid)
    LEFT JOIN (
        SELECT
            nspname,
            nsp.oid as noid
        FROM
            pg_namespace nsp
        WHERE
            oid = {{scid}}::OID
    ) b ON (b.noid = prs.prsnamespace)
WHERE
    prs.oid={{pid}}::OID
) as c;
{% endif %}
