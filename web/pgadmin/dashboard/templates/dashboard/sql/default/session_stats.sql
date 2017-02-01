SELECT
   (SELECT count(*) FROM pg_stat_activity{% if did %} WHERE datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %}) AS "{{ _('Total') }}",
   (SELECT count(*) FROM pg_stat_activity WHERE state = 'active'{% if did %} AND datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %})  AS "{{ _('Active') }}",
   (SELECT count(*) FROM pg_stat_activity WHERE state = 'idle'{% if did %} AND datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %})  AS "{{ _('Idle') }}"