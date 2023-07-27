{% set maintenance_options = [] %}
{% if data.verbose %}{{ maintenance_options.append('VERBOSE') or "" }}{% endif %}
{% if data.vacuum_full %}{{ maintenance_options.append('FULL') or "" }}{% endif %}
{% if data.vacuum_freeze %}{{ maintenance_options.append('FREEZE') or "" }}{% endif %}
{% if data.vacuum_analyze %}{{ maintenance_options.append('ANALYZE') or "" }}{% endif %}
{% if data.vacuum_disable_page_skipping %}{{ maintenance_options.append('DISABLE_PAGE_SKIPPING') or "" }}{% endif %}
{% if data.skip_locked %}{{ maintenance_options.append('SKIP_LOCKED') or "" }}{% endif %}
{% if data.vacuum_truncate %}{{ maintenance_options.append('TRUNCATE') or "" }}{% endif %}
{% if data.vacuum_process_toast %}{{ maintenance_options.append('PROCESS_TOAST') or "" }}{% endif %}
{% if data.vacuum_process_main %}{{ maintenance_options.append('PROCESS_MAIN') or "" }}{% endif %}
{% if data.vacuum_skip_database_stats %}{{ maintenance_options.append('SKIP_DATABASE_STATS') or "" }}{% endif %}
{% if data.vacuum_only_database_stats %}{{ maintenance_options.append('ONLY_DATABASE_STATS') or "" }}{% endif %}
{% if data.vacuum_index_cleanup %}{{ maintenance_options.append('INDEX_CLEANUP ' + data.vacuum_index_cleanup) or "" }}{% endif %}
{% if data.vacuum_parallel %}{{ maintenance_options.append('PARALLEL ' + data.vacuum_parallel) or "" }}{% endif %}
{% if data.buffer_usage_limit %}{{ maintenance_options.append('BUFFER_USAGE_LIMIT "' + data.buffer_usage_limit + '"') or "" }}{% endif %}
{% if data.reindex_tablespace %}{{ maintenance_options.append('TABLESPACE "' + data.reindex_tablespace + '"') or "" }}{% endif %}
{% if data.reindex_concurrently %}{{ maintenance_options.append('CONCURRENTLY') or "" }}{% endif %}
{% if data.op == "VACUUM" %}
VACUUM{% for option in maintenance_options %}{% if loop.first %} ({% endif %}{{ option }}{% if not loop.last %}, {% endif %}{% if loop.last %}){% endif %}{% endfor %}{% if data.schema %} {{ conn|qtIdent(data.schema) }}.{{ conn|qtIdent(data.table) }}{% endif %};
{% endif %}
{% if data.op == "ANALYZE" %}
ANALYZE{% for option in maintenance_options %}{% if loop.first %} ({% endif %}{{ option }}{% if not loop.last %}, {% endif %}{% if loop.last %}){% endif %}{% endfor %}{% if data.schema %} {{ conn|qtIdent(data.schema, data.table) }}{% endif %};
{% endif %}
{% if data.op == "REINDEX" %}
{% if index_name %}
REINDEX{% for option in maintenance_options %}{% if loop.first %} ({% endif %}{{ option }}{% if not loop.last %}, {% endif %}{% if loop.last %}){% endif %}{% endfor %} INDEX {{ conn|qtIdent(data.schema, index_name) }};
{% else %}
REINDEX{% for option in maintenance_options %}{% if loop.first %} ({% endif %}{{ option }}{% if not loop.last %}, {% endif %}{% if loop.last %}){% endif %}{% endfor %}{% if not data.schema and not data.reindex_system %} DATABASE {{ conn|qtIdent(data.database) }}{% elif not data.schema and data.reindex_system%} SYSTEM {{ conn|qtIdent(data.database) }}{% elif data.schema and not data.table and not data.primary_key and not data.unique_constraint and not data.index and not data.mview %} SCHEMA {{ conn|qtIdent(data.schema) }}{% else %} TABLE {{ conn|qtIdent(data.schema, data.table) }}{% endif %};
{% endif %}
{% endif %}
{% if data.op == "CLUSTER" %}
CLUSTER{% if data.verbose %} VERBOSE{% endif %}{% if data.schema %} {{ conn|qtIdent(data.schema, data.table) }}{% endif %}{% if index_name %}
 USING {{ conn|qtIdent(index_name) }}{% endif %};
{% endif %}
