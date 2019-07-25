SELECT quote_ident(nspname) || '.' || quote_ident(proname) AS sfunctions
FROM pg_proc p, pg_namespace n, pg_language l
WHERE p.pronamespace = n.oid
AND p.prolang = l.oid
AND p.prorettype = 'internal'::regtype::oid
AND pg_catalog.array_to_string(p.proargtypes, ',') = 'internal'::regtype::oid::text
AND (l.lanname = 'internal' or l.lanname = 'c' )
--     -- If Show SystemObjects is not true
{% if not show_system_objects %}
 	AND (nspname NOT LIKE 'pg\_%' AND nspname NOT in ('information_schema'))
{% endif %}
ORDER BY nspname ASC, proname ASC
