SELECT pg_catalog.quote_ident(nspname) || '.' || pg_catalog.quote_ident(proname) AS tfunctions
FROM pg_catalog.pg_proc p, pg_catalog.pg_namespace n, pg_catalog.pg_language l
    WHERE p.pronamespace = n.oid
    AND p.prolang = l.oid
    -- PGOID_TYPE_TRIGGER = 2279
    AND prorettype = 2279
    -- If Show SystemObjects is not true
    {% if not show_system_objects %}
    AND (nspname NOT LIKE 'pg\_%' AND nspname NOT in ('information_schema'))
    {% endif %}
    -- Find function for specific OID
    {% if tgfoid %}
    AND p.oid = {{tgfoid}}::OID
    {% endif %}
    ORDER BY nspname ASC, proname ASC
