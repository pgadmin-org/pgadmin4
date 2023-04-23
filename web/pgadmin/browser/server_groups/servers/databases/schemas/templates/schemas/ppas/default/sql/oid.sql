SELECT nsp.oid FROM pg_catalog.pg_namespace nsp WHERE nsp.nspname = {{ schema|qtLiteral(conn) }};
