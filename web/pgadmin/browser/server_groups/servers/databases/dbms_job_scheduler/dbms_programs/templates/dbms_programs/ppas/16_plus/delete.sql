EXEC dbms_scheduler.DROP_PROGRAM(
    {{ program_name|qtLiteral(conn) }}
);
