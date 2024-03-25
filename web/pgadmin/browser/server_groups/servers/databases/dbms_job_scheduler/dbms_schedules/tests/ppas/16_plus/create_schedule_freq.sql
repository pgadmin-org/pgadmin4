-- DBMS Schedule: 'dbms_test_sch_daily_freq'

-- EXEC dbms_scheduler.DROP_SCHEDULE('dbms_test_sch_daily_freq');

EXEC dbms_scheduler.CREATE_SCHEDULE(
  schedule_name   => 'dbms_test_sch_daily_freq',
  repeat_interval => 'FREQ=DAILY;');
