SELECT
    relname AS {{ conn|qtIdent(_('Name')) }},
    blks_read AS {{ conn|qtIdent(_('Blocks read')) }},
    blks_hit AS {{ conn|qtIdent(_('Blocks hit')) }}
FROM
    pg_catalog.pg_statio_all_sequences
WHERE
    schemaname = {{ schema_name|qtLiteral }}
ORDER BY relname;
