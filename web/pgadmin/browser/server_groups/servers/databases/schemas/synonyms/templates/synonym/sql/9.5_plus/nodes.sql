SELECT synname as name
FROM pg_synonym s
    JOIN pg_namespace ns ON s.synnamespace = ns.oid
    AND s.synnamespace = {{scid}}::oid
ORDER BY synname;
