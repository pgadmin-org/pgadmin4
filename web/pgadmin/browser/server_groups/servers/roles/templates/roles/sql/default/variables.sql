SELECT
    pg_catalog.split_part(rolconfig, '=', 1) AS name, pg_catalog.replace(rolconfig, pg_catalog.split_part(rolconfig, '=', 1) || '=', '') AS value, NULL::text AS database
FROM
    (SELECT
            pg_catalog.unnest(rolconfig) AS rolconfig, rolcanlogin, rolname
    FROM
        pg_catalog.pg_roles
    WHERE
        oid={{ rid|qtLiteral }}::OID
    ) r

UNION ALL
SELECT
    pg_catalog.split_part(rolconfig, '=', 1) AS name, pg_catalog.replace(rolconfig, pg_catalog.split_part(rolconfig, '=', 1) || '=', '') AS value, datname AS database
FROM
    (SELECT
        d.datname, pg_catalog.unnest(c.setconfig) AS rolconfig
    FROM
        (SELECT *
        FROM pg_catalog.pg_db_role_setting dr
        WHERE
            dr.setrole={{ rid|qtLiteral }}::OID AND dr.setdatabase!=0
        ) c
        LEFT JOIN pg_catalog.pg_database d ON (d.oid = c.setdatabase)
    ) a;
