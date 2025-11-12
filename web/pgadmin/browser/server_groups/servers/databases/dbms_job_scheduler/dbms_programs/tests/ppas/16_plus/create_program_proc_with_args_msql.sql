EXEC dbms_scheduler.CREATE_PROGRAM(
  program_name        => 'dbms_prg_proc_with_args',
  program_type        => 'STORED_PROCEDURE',
  program_action      => 'public.test_proc_with_args',
  number_of_arguments => 2,
  enabled             => True,
  comments            => 'This is a STORED_PROCEDURE program.'
);

EXEC dbms_scheduler.DEFINE_PROGRAM_ARGUMENT(
  program_name      => 'dbms_prg_proc_with_args',
  argument_position => 0,
  argument_name     => 'salary',
  argument_type     => 'bigint',
  default_value     => '10000'
);

EXEC dbms_scheduler.DEFINE_PROGRAM_ARGUMENT(
  program_name      => 'dbms_prg_proc_with_args',
  argument_position => 1,
  argument_name     => 'name',
  argument_type     => 'character varying',
  default_value     => ' -'
);
