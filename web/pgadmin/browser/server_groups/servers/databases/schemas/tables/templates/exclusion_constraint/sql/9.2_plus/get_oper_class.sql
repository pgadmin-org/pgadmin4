SELECT opcname
FROM pg_opclass opc,
pg_am am
WHERE opcmethod=am.oid AND
      am.amname ={{indextype|qtLiteral}} AND
      NOT opcdefault
ORDER BY 1