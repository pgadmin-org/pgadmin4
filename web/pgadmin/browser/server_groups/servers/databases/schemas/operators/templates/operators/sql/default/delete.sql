{% if lefttype %}
{% set ltype = lefttype %}
{% else %}
{% set ltype = none %}
{% endif %}
{% if righttype %}
{% set rtype = righttype %}
{% else %}
{% set rtype = none %}
{% endif %}
{% if name %}
DROP OPERATOR IF EXISTS {{conn|qtIdent(oprnamespace)}}.{{name}} ({{ltype}} , {{rtype}}){% if cascade %} CASCADE{% endif %};
{% endif %}
