SELECT opcname,  opcmethod
FROM pg_opclass
    WHERE opcmethod = {{oid}}::OID
    AND NOT opcdefault
    ORDER BY 1;