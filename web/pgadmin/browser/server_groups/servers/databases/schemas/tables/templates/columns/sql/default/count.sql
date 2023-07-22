SELECT COUNT(*)
FROM pg_catalog.pg_attribute att
WHERE
    att.attrelid = {{ tid|qtLiteral(conn) }}::oid
{### To show system objects ###}
{% if not showsysobj %}
    AND att.attnum > 0
{% endif %}
    AND att.attisdropped IS FALSE
