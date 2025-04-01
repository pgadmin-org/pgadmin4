SELECT COUNT(*)
FROM pg_catalog.pg_synonym s
    JOIN pg_catalog.pg_namespace ns ON s.synnamespace = ns.oid
    AND s.synnamespace = {{scid}}::oid
