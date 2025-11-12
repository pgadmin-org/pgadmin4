EXEC dbms_scheduler.CREATE_SCHEDULE(
  schedule_name   => 'dbms_test_sch_monthly_start_date',
  repeat_interval => 'FREQ=MONTHLY;',
  start_date      => '2024-02-27 00:00:00 +05:30');
