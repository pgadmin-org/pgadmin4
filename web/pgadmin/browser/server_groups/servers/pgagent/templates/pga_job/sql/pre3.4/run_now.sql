UPDATE pgagent.pga_job
SET jobnextrun=now()::timestamptz
WHERE jobid={{ jid|qtLiteral(conn) }}::integer
