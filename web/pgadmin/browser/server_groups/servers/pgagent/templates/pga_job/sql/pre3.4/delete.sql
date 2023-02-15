DELETE FROM pgagent.pga_job WHERE jobid = {{ jid|qtLiteral(conn) }}::integer;
