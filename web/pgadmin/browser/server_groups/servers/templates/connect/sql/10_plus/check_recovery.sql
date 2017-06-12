SELECT CASE WHEN usesuper
       THEN pg_is_in_recovery()
       ELSE FALSE
       END as inrecovery,
       CASE WHEN usesuper AND pg_is_in_recovery()
       THEN pg_is_wal_replay_paused()
       ELSE FALSE
       END as isreplaypaused
FROM pg_user WHERE usename=current_user