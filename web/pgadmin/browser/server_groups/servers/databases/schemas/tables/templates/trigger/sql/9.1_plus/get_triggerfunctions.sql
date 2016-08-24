SELECT quote_ident(nspname) || '.' || quote_ident(proname) AS tfunctions
FROM pg_proc p, pg_namespace n, pg_language l
    WHERE p.pronamespace = n.oid
    AND p.prolang = l.oid
    -- PGOID_TYPE_TRIGGER = 2279
    AND l.lanname != 'edbspl' AND prorettype = 2279
    -- If Show SystemObjects is not true
    {% if not show_system_objects %}
    AND (nspname NOT LIKE E'pg\_%' AND nspname NOT in ('information_schema'))
    {% endif %}
    -- Find function for specific OID
    {% if tgfoid %}
    AND p.oid = {{tgfoid}}::OID
    {% endif %}
    ORDER BY nspname ASC, proname ASC
