{### SQL to delete tablespace object ###}
DROP TABLESPACE IF EXISTS {{ conn|qtIdent(tsname) }};
