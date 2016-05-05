SELECT
   (SELECT sum(tup_fetched) FROM pg_stat_database{% if did %} WHERE datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %}) AS "{{ _('Fetched') }}",
   (SELECT sum(tup_returned) FROM pg_stat_database{% if did %} WHERE datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %}) AS "{{ _('Returned') }}"