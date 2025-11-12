SELECT value
FROM dba_scheduler_job_args
WHERE job_name = {{ job_name|qtLiteral(conn) }} AND argument_name = {{ arg_name|qtLiteral(conn) }}
