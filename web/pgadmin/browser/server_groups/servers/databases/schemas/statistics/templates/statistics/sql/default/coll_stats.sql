{### Get collection statistics for statistics objects ###}
SELECT
    COUNT(*) AS {{ conn|qtIdent(_('Statistics')) }}
FROM pg_catalog.pg_statistic_ext s
WHERE s.stxnamespace = {{scid}}::oid
