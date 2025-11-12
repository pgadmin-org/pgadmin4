EXEC dbms_scheduler.CREATE_SCHEDULE(
  schedule_name   => 'dbms_test_sch_yearly',
  repeat_interval => 'FREQ=YEARLY;BYMONTH=JAN,MAY,DEC;BYMONTHDAY=2,8,31,27;BYDAY=SUN,MON,TUE,WED,THU,FRI,SAT;BYHOUR=05,18,22;BYMINUTE=45,37,58',
  start_date      => '2024-02-27 00:00:00 +05:30',
  end_date        => '2024-02-28 00:00:00 +05:30',
  comments        => 'This is yearly test schedule'
);
