-- DBMS Schedule: 'dbms_test_sch_monthly_start_date'

-- EXEC dbms_scheduler.DROP_SCHEDULE('dbms_test_sch_monthly_start_date');

EXEC dbms_scheduler.CREATE_SCHEDULE(
  schedule_name   => 'dbms_test_sch_monthly_start_date',
  repeat_interval => 'FREQ=MONTHLY;',
  start_date      => '<TIMESTAMPTZ_1>');
