SELECT
   (SELECT sum(tup_inserted) FROM pg_stat_database{% if did %} WHERE datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %}) AS "{{ _('Inserts') }}",
   (SELECT sum(tup_updated) FROM pg_stat_database{% if did %} WHERE datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %}) AS "{{ _('Updates') }}",
   (SELECT sum(tup_deleted) FROM pg_stat_database{% if did %} WHERE datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %}) AS "{{ _('Deletes') }}"