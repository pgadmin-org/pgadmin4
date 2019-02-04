/*pga4dash*/
{% set add_union = false %}
{% if 'session_stats' in chart_names %}
{% set add_union = true %}
SELECT 'session_stats' AS chart_name, row_to_json(t) AS chart_data
FROM (SELECT
   (SELECT count(*) FROM pg_stat_activity{% if did %} WHERE datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %}) AS "{{ _('Total') }}",
   (SELECT count(*) FROM pg_stat_activity WHERE state = 'active'{% if did %} AND datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %})  AS "{{ _('Active') }}",
   (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle'{% if did %} AND datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %})  AS "{{ _('Idle') }}"
) t
{% endif %}
{% if add_union and 'tps_stats' in chart_names %}
UNION ALL
{% endif %}
{% if 'tps_stats' in chart_names %}
{% set add_union = true %}
SELECT 'tps_stats' AS chart_name, row_to_json(t) AS chart_data
FROM (SELECT
   (SELECT sum(xact_commit) + sum(xact_rollback) FROM pg_stat_database{% if did %} WHERE datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %}) AS "{{ _('Transactions') }}",
   (SELECT sum(xact_commit) FROM pg_stat_database{% if did %} WHERE datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %}) AS "{{ _('Commits') }}",
   (SELECT sum(xact_rollback) FROM pg_stat_database{% if did %} WHERE datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %}) AS "{{ _('Rollbacks') }}"
) t
{% endif %}
{% if add_union and 'ti_stats' in chart_names %}
UNION ALL
{% endif %}
{% if 'ti_stats' in chart_names %}
{% set add_union = true %}
SELECT 'ti_stats' AS chart_name, row_to_json(t) AS chart_data
FROM (SELECT
   (SELECT sum(tup_inserted) FROM pg_stat_database{% if did %} WHERE datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %}) AS "{{ _('Inserts') }}",
   (SELECT sum(tup_updated) FROM pg_stat_database{% if did %} WHERE datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %}) AS "{{ _('Updates') }}",
   (SELECT sum(tup_deleted) FROM pg_stat_database{% if did %} WHERE datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %}) AS "{{ _('Deletes') }}"
) t
{% endif %}
{% if add_union and 'to_stats' in chart_names %}
UNION ALL
{% endif %}
{% if 'to_stats' in chart_names %}
{% set add_union = true %}
SELECT 'to_stats' AS chart_name, row_to_json(t) AS chart_data
FROM (SELECT
   (SELECT sum(tup_fetched) FROM pg_stat_database{% if did %} WHERE datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %}) AS "{{ _('Fetched') }}",
   (SELECT sum(tup_returned) FROM pg_stat_database{% if did %} WHERE datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %}) AS "{{ _('Returned') }}"
) t
{% endif %}
{% if add_union and 'bio_stats' in chart_names %}
UNION ALL
{% endif %}
{% if 'bio_stats' in chart_names %}
{% set add_union = true %}
SELECT 'bio_stats' AS chart_name, row_to_json(t) AS chart_data
FROM (SELECT
   (SELECT sum(blks_read) FROM pg_stat_database{% if did %} WHERE datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %}) AS "{{ _('Reads') }}",
   (SELECT sum(blks_hit) FROM pg_stat_database{% if did %} WHERE datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %}) AS "{{ _('Hits') }}"
) t
{% endif %}
