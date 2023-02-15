SELECT nsp.nspname FROM pg_catalog.pg_namespace nsp WHERE nsp.oid = {{ scid|qtLiteral(conn) }};
