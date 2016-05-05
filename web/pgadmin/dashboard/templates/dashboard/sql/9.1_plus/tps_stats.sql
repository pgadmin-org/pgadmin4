SELECT
   (SELECT sum(xact_commit) + sum(xact_rollback) FROM pg_stat_database{% if did %} WHERE datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %}) AS "{{ _('Transactions') }}",
   (SELECT sum(xact_commit) FROM pg_stat_database{% if did %} WHERE datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %}) AS "{{ _('Commits') }}",
   (SELECT sum(xact_rollback) FROM pg_stat_database{% if did %} WHERE datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %}) AS "{{ _('Rollbacks') }}"