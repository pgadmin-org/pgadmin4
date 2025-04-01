SELECT
    pg_catalog.array_to_string(array_agg(sql), E'\n\n') as sql
FROM
(SELECT
    E'-- Cast: ' ||
    pg_catalog.format_type(st.oid, null)|| E' -> ' ||
    pg_catalog.format_type(tt.oid, tt.typtypmod) ||
    E'\n\n-- DROP CAST (' || pg_catalog.format_type(st.oid, null) ||
    E' AS ' || pg_catalog.format_type(tt.oid,tt.typtypmod) ||
    E');\n\nCREATE CAST (' || pg_catalog.format_type(st.oid, null) ||
    E' AS ' || pg_catalog.format_type(tt.oid,tt.typtypmod) || E')\n' ||
    CASE WHEN ca.castfunc != 0 THEN
    E'\tWITH FUNCTION ' ||
    pr.proname || '(' || COALESCE(pg_catalog.pg_get_function_identity_arguments(pr.oid), '') || E')'
    WHEN ca.castfunc = 0 AND ca.castmethod = 'i' THEN
    E'\tWITH INOUT'
    ELSE E'\tWITHOUT FUNCTION' END ||
    CASE WHEN ca.castcontext = 'a' THEN E'\n\tAS ASSIGNMENT;'
    WHEN ca.castcontext = 'i' THEN E'\n\tAS IMPLICIT;'
    ELSE E';' END ||
    CASE WHEN a.description IS NOT NULL THEN
        E'\n\nCOMMENT ON CAST (' || (pg_catalog.format_type(st.oid,NULL)) ||
        E' AS ' || (pg_catalog.format_type(tt.oid,tt.typtypmod)) ||
        E') IS ' || pg_catalog.quote_literal(description) || E';'
    ELSE ''  END as sql
FROM
    pg_catalog.pg_cast ca
    JOIN pg_catalog.pg_type st ON st.oid=ca.castsource
    JOIN pg_catalog.pg_namespace ns ON ns.oid=st.typnamespace
    JOIN pg_catalog.pg_type tt ON tt.oid=ca.casttarget
    JOIN pg_catalog.pg_namespace nt ON nt.oid=tt.typnamespace
    LEFT JOIN pg_catalog.pg_proc pr ON pr.oid=ca.castfunc
    LEFT JOIN (
        SELECT
            des.description as description,
            des.objoid as descoid
        FROM
            pg_catalog.pg_description des
        WHERE
            des.objoid={{cid}}::OID AND des.objsubid=0 AND des.classoid='pg_cast'::regclass
     ) a ON (a.descoid = ca.oid)
WHERE
    ca.oid={{cid}}::OID
) c;
