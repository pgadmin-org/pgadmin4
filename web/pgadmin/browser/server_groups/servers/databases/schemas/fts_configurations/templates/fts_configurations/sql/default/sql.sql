{# REVERSED ENGINEERED SQL FOR FTS CONFIGURATION #}
{% if cfgid and scid %}
SELECT
    pg_catalog.array_to_string(array_agg(sql), E'\n\n') as sql
FROM
    (
    SELECT
        E'-- Text Search CONFIGURATION: ' || pg_catalog.quote_ident(nspname) || E'.'
        || (cfg.cfgname) ||
        E'\n\n-- DROP TEXT SEARCH CONFIGURATION ' || pg_catalog.quote_ident(nspname) ||
        E'.' || pg_catalog.quote_ident(cfg.cfgname) ||
        E'\n\nCREATE TEXT SEARCH CONFIGURATION ' || pg_catalog.quote_ident(nspname) ||
        E'.' ||  pg_catalog.quote_ident(cfg.cfgname) || E' (\n' ||
        E'\tPARSER = ' || parsername ||
        E'\n);' ||
        CASE
            WHEN description IS NOT NULL THEN
                E'\n\nCOMMENT ON TEXT SEARCH CONFIGURATION ' ||
                pg_catalog.quote_ident(nspname) || E'.' || pg_catalog.quote_ident(cfg.cfgname) ||
                E' IS ' || pg_catalog.quote_literal(description) || E';'
            ELSE ''
        END || E'\n' ||

        pg_catalog.array_to_string(
         array(
	        SELECT
	            'ALTER TEXT SEARCH CONFIGURATION ' || pg_catalog.quote_ident(b.nspname) ||
	            E'.' || pg_catalog.quote_ident(cfg.cfgname) || ' ADD MAPPING FOR ' ||
	            t.alias  || ' WITH ' ||
                pg_catalog.array_to_string(array_agg(
                    CASE WHEN (pg_ns.nspname != 'pg_catalog') THEN
                        pg_catalog.CONCAT(pg_ns.nspname, '.', dict.dictname)
                    ELSE
                        dict.dictname END), ', ') || ';'
            FROM
                pg_catalog.pg_ts_config_map map
                LEFT JOIN (
                          SELECT
                              tokid,
                              alias
                          FROM
                              pg_catalog.ts_token_type(cfg.cfgparser)
                          ) t ON (t.tokid = map.maptokentype)
                LEFT OUTER JOIN pg_catalog.pg_ts_dict dict ON (map.mapdict = dict.oid)
                LEFT OUTER JOIN pg_catalog.pg_namespace pg_ns ON (pg_ns.oid = dict.dictnamespace)
            WHERE
                map.mapcfg = cfg.oid
            GROUP BY t.alias
            ORDER BY t.alias)
        , E'\n') as sql
    FROM
        pg_catalog.pg_ts_config cfg
    LEFT JOIN (
        SELECT
            des.description as description,
            des.objoid as descoid
        FROM
            pg_catalog.pg_description des
        WHERE
            des.objoid={{cfgid}}::OID AND des.classoid='pg_ts_config'::regclass
    ) a ON (a.descoid = cfg.oid)
    LEFT JOIN (
        SELECT
            nspname,
            nsp.oid as noid
        FROM
            pg_catalog.pg_namespace nsp
        WHERE
            oid = {{scid}}::OID
    ) b ON (b.noid = cfg.cfgnamespace)
    LEFT JOIN(
        SELECT
            prs.prsname as parsername,
            prs.oid as oid
        FROM
            pg_catalog.pg_ts_parser prs
    )c ON (c.oid = cfg.cfgparser)
    WHERE
       cfg.oid={{cfgid}}::OID
    ) e;
{% endif %}
