{### SQL to delete directory object ###}
DROP DIRECTORY IF EXISTS {{ conn|qtIdent(dr_name) }};
