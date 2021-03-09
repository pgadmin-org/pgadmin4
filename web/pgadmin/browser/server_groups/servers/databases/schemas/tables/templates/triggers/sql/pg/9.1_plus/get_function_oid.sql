SELECT p.oid AS tfuncoid, p.proname AS tfunction,
    p.pronamespace AS tfuncschoid, n.nspname AS tfuncschema, l.lanname
FROM pg_catalog.pg_trigger t
    LEFT OUTER JOIN pg_catalog.pg_proc p ON p.oid=t.tgfoid
	LEFT OUTER JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
	LEFT OUTER JOIN pg_catalog.pg_language l ON l.oid=p.prolang
WHERE NOT tgisinternal
    AND tgrelid = {{tid}}::OID
    AND t.oid = {{trid}}::OID
