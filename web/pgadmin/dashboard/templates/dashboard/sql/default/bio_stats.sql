SELECT
   (SELECT sum(blks_read) FROM pg_stat_database{% if did %} WHERE datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %}) AS "{{ _('Reads') }}",
   (SELECT sum(blks_hit) FROM pg_stat_database{% if did %} WHERE datname = (SELECT datname FROM pg_database WHERE oid = {{ did }}){% endif %}) AS "{{ _('Hits') }}"
