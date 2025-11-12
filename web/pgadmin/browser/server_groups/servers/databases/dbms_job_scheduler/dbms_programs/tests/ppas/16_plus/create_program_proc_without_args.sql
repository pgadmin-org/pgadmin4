-- DBMS Program: 'dbms_prg_proc_without_args'

-- EXEC dbms_scheduler.DROP_PROGRAM('dbms_prg_proc_without_args');

EXEC dbms_scheduler.CREATE_PROGRAM(
  program_name        => 'dbms_prg_proc_without_args',
  program_type        => 'STORED_PROCEDURE',
  program_action      => 'public.test_proc_without_args',
  comments            => 'This is a STORED_PROCEDURE program.'
);
