SELECT cl.oid as oid
FROM pg_class cl
LEFT OUTER JOIN pg_description des ON (des.objoid=cl.oid AND des.classoid='pg_class'::regclass)
WHERE relkind = 'S' AND relnamespace  = {{scid}}::oid
AND relname = {{ name|qtLiteral }}