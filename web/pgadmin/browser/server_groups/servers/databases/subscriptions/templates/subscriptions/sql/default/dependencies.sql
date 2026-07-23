SELECT subpublications AS pub FROM pg_catalog.pg_subscription
WHERE subname = {{subname|qtLiteral(conn)}};
