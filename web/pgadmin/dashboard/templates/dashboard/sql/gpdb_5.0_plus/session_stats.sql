/*pga4dash*/
SELECT
   (SELECT count(*) FROM pg_stat_activity{% if did %} WHERE datid = {{ did }} {% endif %}) AS "{{ _('Total') }}",
   (SELECT count(*) FROM pg_stat_activity WHERE current_query NOT LIKE '<IDLE>%'{% if did %} AND datid = {{ did }} {% endif %})  AS "{{ _('Active') }}",
   (SELECT count(*) FROM pg_stat_activity WHERE current_query LIKE '<IDLE>%'{% if did %} AND datid =  {{ did }} {% endif %})  AS "{{ _('Idle') }}"
