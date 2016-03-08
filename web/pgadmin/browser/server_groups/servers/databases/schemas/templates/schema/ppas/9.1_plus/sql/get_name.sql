SELECT nsp.nspname FROM pg_namespace nsp WHERE nsp.oid = {{ scid|qtLiteral }};
