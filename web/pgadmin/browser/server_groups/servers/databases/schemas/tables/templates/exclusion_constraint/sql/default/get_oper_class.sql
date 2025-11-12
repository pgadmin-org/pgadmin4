SELECT opcname
FROM pg_catalog.pg_opclass opc,
pg_catalog.pg_am am
WHERE opcmethod=am.oid AND
      am.amname ={{indextype|qtLiteral(conn)}} AND
      NOT opcdefault
ORDER BY 1
