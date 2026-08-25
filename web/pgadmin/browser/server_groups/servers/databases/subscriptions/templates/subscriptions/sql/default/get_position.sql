SELECT oid, subname AS name FROM pg_catalog.pg_subscription WHERE subname = {{ subname|qtLiteral(conn) }}  and subdbid={{did}} :: oid;
