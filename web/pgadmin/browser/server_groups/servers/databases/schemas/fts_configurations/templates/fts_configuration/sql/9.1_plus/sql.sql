{# REVERSED ENGINEERED SQL FOR FTS CONFIGURATION #}
{% if cfgid and scid %}
SELECT
    array_to_string(array_agg(sql), E'\n\n') as sql
FROM
    (
    SELECT
        E'-- Text Search CONFIGURATION: ' || quote_ident(nspname) || E'.'
        || quote_ident(cfg.cfgname) ||
        E'\n\n-- DROP TEXT SEARCH CONFIGURATION ' || quote_ident(nspname) ||
        E'.' || quote_ident(cfg.cfgname) ||
        E'\n\nCREATE TEXT SEARCH CONFIGURATION ' || quote_ident(nspname) ||
        E'.' ||  quote_ident(cfg.cfgname) || E' (\n' ||
        E'\tPARSER = ' || parsername ||
        E'\n);' ||
        CASE
            WHEN description IS NOT NULL THEN
                E'\n\nCOMMENT ON TEXT SEARCH CONFIGURATION ' ||
                quote_ident(nspname) || E'.' || quote_ident(cfg.cfgname) ||
                E' IS ' || pg_catalog.quote_literal(description) || E';'
            ELSE ''
        END || E'\n' ||

        array_to_string(
         array(
	        SELECT
	            'ALTER TEXT SEARCH CONFIGURATION ' || quote_ident(nspname) ||
	            E'.' || quote_ident(cfg.cfgname) || ' ADD MAPPING FOR ' ||
	            t.alias  || ' WITH ' ||
	            array_to_string(array_agg(dict.dictname), ', ') || ';'
            FROM
                pg_ts_config_map map
                LEFT JOIN (
                          SELECT
                              tokid,
                              alias
                          FROM
                              pg_catalog.ts_token_type(cfg.cfgparser)
                          ) t ON (t.tokid = map.maptokentype)
                LEFT OUTER JOIN pg_ts_dict dict ON (map.mapdict = dict.oid)
            WHERE
                map.mapcfg = cfg.oid
            GROUP BY t.alias
            ORDER BY t.alias)
        , E'\n') as sql
    FROM
        pg_ts_config cfg
    LEFT JOIN (
        SELECT
            des.description as description,
            des.objoid as descoid
        FROM
            pg_description des
        WHERE
            des.objoid={{cfgid}}::OID AND des.classoid='pg_ts_config'::regclass
    ) a ON (a.descoid = cfg.oid)
    LEFT JOIN (
        SELECT
            nspname,
            nsp.oid as noid
        FROM
            pg_namespace nsp
        WHERE
            oid = {{scid}}::OID
    ) b ON (b.noid = cfg.cfgnamespace)
    LEFT JOIN(
        SELECT
            prs.prsname as parsername,
            prs.oid as oid
        FROM
            pg_ts_parser prs
    )c ON (c.oid = cfg.cfgparser)
    WHERE
       cfg.oid={{cfgid}}::OID
    ) e;
{% endif %}