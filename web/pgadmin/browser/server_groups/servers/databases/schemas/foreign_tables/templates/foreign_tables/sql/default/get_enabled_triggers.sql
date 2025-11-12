SELECT count(*) FROM pg_catalog.pg_trigger WHERE tgrelid={{tid}} AND tgisinternal = FALSE AND tgenabled = 'O'
