SELECT t.oid, t.tgname as name, (CASE WHEN tgenabled = 'O' THEN true ElSE false END) AS is_enable_trigger
FROM pg_trigger t
    WHERE tgrelid = {{tid}}::OID
{% if trid %}
    AND t.oid = {{trid}}::OID
{% endif %}
    ORDER BY tgname;
