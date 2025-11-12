-- DBMS Program: 'dbms_prg_with_psql'

-- EXEC dbms_scheduler.DROP_PROGRAM('dbms_prg_with_psql');

EXEC dbms_scheduler.CREATE_PROGRAM(
  program_name        => 'dbms_prg_with_psql',
  program_type        => 'PLSQL_BLOCK',
  program_action      => 'BEGIN PERFORM 1; END;',
  enabled             => True,
  comments            => 'This is a PLSQL program.'
);
