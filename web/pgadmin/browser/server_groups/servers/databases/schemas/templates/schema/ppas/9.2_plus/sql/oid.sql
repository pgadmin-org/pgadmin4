SELECT nsp.oid FROM pg_namespace nsp WHERE nsp.nspname = {{ schema|qtLiteral }};
