SELECT COUNT(*)
FROM pg_catalog.pg_subscription sub
WHERE sub.subdbid = {{ did }}
