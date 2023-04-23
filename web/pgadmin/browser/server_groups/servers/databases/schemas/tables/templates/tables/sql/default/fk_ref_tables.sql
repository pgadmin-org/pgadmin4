SELECT
    co.conrelid as confrelid, co.conname, nl.oid as refnspoid
FROM pg_catalog.pg_depend dep
    JOIN pg_catalog.pg_constraint co ON dep.objid=co.oid
    JOIN pg_catalog.pg_class cl ON cl.oid=co.conrelid
    JOIN pg_catalog.pg_namespace nl ON nl.oid=cl.relnamespace
    WHERE dep.refobjid={{oid}}::OID
    AND deptype = 'n'


