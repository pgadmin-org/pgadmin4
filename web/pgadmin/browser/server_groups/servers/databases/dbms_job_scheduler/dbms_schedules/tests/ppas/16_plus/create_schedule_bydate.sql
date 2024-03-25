-- DBMS Schedule: 'dbms_test_sch_yearly_by_date'

-- EXEC dbms_scheduler.DROP_SCHEDULE('dbms_test_sch_yearly_by_date');

EXEC dbms_scheduler.CREATE_SCHEDULE(
  schedule_name   => 'dbms_test_sch_yearly_by_date',
  repeat_interval => 'FREQ=YEARLY;BYDATE=20250113;',
  start_date      => '<TIMESTAMPTZ_1>',
  end_date        => '<TIMESTAMPTZ_2>',
  comments        => 'This is yearly by date test schedule'
);
