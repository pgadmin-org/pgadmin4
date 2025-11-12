EXEC dbms_scheduler.CREATE_SCHEDULE(
  schedule_name   => 'dbms_test_sch_yearly_by_date',
  repeat_interval => 'FREQ=YEARLY;BYDATE=20250113;',
  start_date      => '2024-02-27 00:00:00 +05:30',
  end_date        => '2024-02-28 00:00:00 +05:30',
  comments        => 'This is yearly by date test schedule'
);
