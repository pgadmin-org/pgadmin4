EXEC dbms_scheduler.DROP_JOB(
    {{ job_name|qtLiteral(conn) }}
);
