{### Get OID of newly created statistics object ###}
SELECT s.oid
FROM pg_catalog.pg_statistic_ext s
    LEFT JOIN pg_catalog.pg_namespace ns ON ns.oid = s.stxnamespace
WHERE s.stxname = {{name|qtLiteral(conn)}}
    AND ns.nspname = {{schema|qtLiteral(conn)}}
