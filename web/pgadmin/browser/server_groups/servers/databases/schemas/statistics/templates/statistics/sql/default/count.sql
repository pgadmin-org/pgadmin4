{### Count statistics objects in schema ###}
SELECT COUNT(*)
FROM pg_catalog.pg_statistic_ext s
WHERE s.stxnamespace = {{scid}}::oid
