{# =================== Fetch Rules ==================== #}
{% if tid or rid %}
SELECT
    rw.oid AS oid,
    rw.rulename AS name,
    relname AS view,
    CASE WHEN relkind = 'r' THEN TRUE ELSE FALSE END AS parentistable,
    nspname AS schema,
    description AS comment,
    {# ===== Check whether it is system rule or not ===== #}
    CASE WHEN rw.rulename = '_RETURN' THEN True ELSE False END AS system_rule,
    CASE WHEN rw.ev_enabled != 'D' THEN True ELSE False END AS enabled,
    pg_get_ruledef(rw.oid, true) AS definition
FROM
    pg_rewrite rw
JOIN pg_class cl ON cl.oid=rw.ev_class
JOIN pg_namespace nsp ON nsp.oid=cl.relnamespace
LEFT OUTER JOIN pg_description des ON (des.objoid=rw.oid AND des.classoid='pg_rewrite'::regclass)
WHERE
  {% if tid %}
      ev_class = {{ tid }}
  {% elif rid %}
      rw.oid = {{ rid }}
  {% endif %}
ORDER BY
    rw.rulename
 {% endif %}
