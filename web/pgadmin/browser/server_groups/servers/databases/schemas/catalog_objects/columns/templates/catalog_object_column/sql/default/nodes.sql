SELECT
    attnum, attname, des.description
FROM pg_catalog.pg_attribute att
    LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=att.attrelid AND des.objsubid=att.attnum AND des.classoid='pg_class'::regclass)
WHERE att.attrelid = {{coid}}::oid
  AND att.attnum > 0
  AND att.attisdropped IS FALSE
ORDER BY att.attnum
