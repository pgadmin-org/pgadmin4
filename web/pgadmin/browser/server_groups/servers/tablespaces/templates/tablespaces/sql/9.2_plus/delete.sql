{### SQL to delete tablespace object ###}
DROP TABLESPACE {{ conn|qtIdent(tsname) }};
