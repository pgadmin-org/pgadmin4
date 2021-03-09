SELECT CASE WHEN usesuper
       THEN pg_catalog.pg_is_in_recovery()
       ELSE FALSE
       END as inrecovery,
       CASE WHEN usesuper AND pg_catalog.pg_is_in_recovery()
       THEN pg_is_xlog_replay_paused()
       ELSE FALSE
       END as isreplaypaused
FROM pg_catalog.pg_user WHERE usename=current_user
