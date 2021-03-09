SELECT
    {% if not did %}db.datname AS {{ conn|qtIdent(_('Database')) }}, {% endif %}
    numbackends AS {{ conn|qtIdent(_('Backends')) }},
    xact_commit AS {{ conn|qtIdent(_('Xact committed')) }},
    xact_rollback AS {{ conn|qtIdent(_('Xact rolled back')) }},
    blks_read AS {{ conn|qtIdent(_('Blocks read')) }},
    blks_hit AS {{ conn|qtIdent(_('Blocks hit')) }},
    tup_returned AS {{ conn|qtIdent(_('Tuples returned')) }},
    tup_fetched AS {{ conn|qtIdent(_('Tuples fetched')) }},
    tup_inserted AS {{ conn|qtIdent(_('Tuples inserted')) }},
    tup_updated AS {{ conn|qtIdent(_('Tuples updated')) }},
    tup_deleted AS {{ conn|qtIdent(_('Tuples deleted')) }},
    pg_catalog.pg_database_size(db.datid) AS {{ conn|qtIdent(_('Size')) }}
FROM
    pg_catalog.pg_stat_database db
WHERE {% if did %}
db.datid = {{ did|qtLiteral }}::OID{% else %}
db.datid > {{ last_system_oid|qtLiteral }}::OID
{% endif %}
{% if db_restrictions %}

AND
db.datname in ({{db_restrictions}})
{% endif %}

ORDER BY db.datname;
