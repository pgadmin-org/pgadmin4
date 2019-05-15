SELECT
  last_vacuum AS {{ conn|qtIdent(_('Last vacuum')) }},
  last_analyze AS  {{ conn|qtIdent(_('Last analyze')) }}
FROM (
	SELECT statime as last_vacuum
	FROM pg_stat_operations
    WHERE actionname LIKE 'VACUUM'
    and objid = {{ tid }}::oid
     ) vacuum_result,
	(
	SELECT statime as last_analyze
	FROM pg_stat_operations
    WHERE actionname LIKE 'ANALYZE'
    and objid = {{ tid }}::oid
  ) analyze_result;

