-- DBMS Program: 'dbms_prg_disabled'

-- EXEC dbms_scheduler.DROP_PROGRAM('dbms_prg_disabled');

EXEC dbms_scheduler.CREATE_PROGRAM(
  program_name        => 'dbms_prg_disabled',
  program_type        => 'PLSQL_BLOCK',
  program_action      => 'BEGIN PERFORM 1; END;');
