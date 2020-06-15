SELECT pl.oid FROM pg_policy pl
WHERE pl.polrelid = {{tid}}::oid AND pl.polname = {{data.name|qtLiteral}};
