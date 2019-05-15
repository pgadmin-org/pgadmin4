{### To fill subtype combobox ###}
{% if subtype %}
SELECT DISTINCT typ.typname AS stype,
    (CASE WHEN typ.typcollation > 0 THEN true ELSE false END) AS is_collate
FROM pg_opclass opc
    JOIN pg_type typ ON opc.opcintype = typ.oid
WHERE opc.opcmethod = 403
ORDER BY 1
{% endif %}
{### To fill subtype opclass combobox ###}
{% if subtype_opclass and data and data.typname %}
SELECT opc.opcname
FROM pg_opclass opc
    JOIN pg_type typ ON opc.opcintype=typ.oid
    AND typ.typname = {{ data.typname|qtLiteral }}
WHERE opc.opcmethod = 403
ORDER BY opcname;
{% endif %}
{### To fetch opcinttype from subtype opclass ###}
{% if get_opcintype and data and data.typname and data.opcname %}
SELECT opc.opcintype
FROM pg_opclass opc
    JOIN pg_type typ ON opc.opcintype=typ.oid
    AND typ.typname = {{ data.typname|qtLiteral }}
WHERE opc.opcmethod = 403
    AND opc.opcname = {{ data.opcname|qtLiteral }}
ORDER BY opcname;
{% endif %}
{### To fill subtype diff function combobox ###}
{% if opcintype %}
SELECT proname, nspname,
    CASE WHEN length(nspname) > 0 AND length(proname) > 0  THEN
        concat(quote_ident(nspname), '.', quote_ident(proname))
    ELSE '' END AS stypdiff
FROM pg_proc
    JOIN pg_namespace n ON n.oid=pronamespace
WHERE prorettype = 701
    AND proargtypes = '{{opcintype}} {{opcintype}}'
ORDER BY proname;
{% endif %}
{### To fill canonical combobox ###}
{% if getoid %}
SELECT oid FROM pg_type
WHERE typname = {{ data.name|qtLiteral }}
{% endif %}
{% if canonical and oid %}
SELECT proname, nspname,
    CASE WHEN length(nspname) > 0 AND length(proname) > 0  THEN
        concat(quote_ident(nspname), '.', quote_ident(proname))
    ELSE '' END AS canonical
FROM pg_proc
    JOIN pg_namespace n ON n.oid=pronamespace
WHERE prorettype= {{ oid }}
    AND proargtypes = '{{ oid }}'
ORDER BY proname;
{% endif %}