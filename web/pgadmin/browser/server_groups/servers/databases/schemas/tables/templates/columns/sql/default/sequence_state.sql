{### The identity sequence's own position, read only when the sequence is readable (#10550) ###}
{% if seqname %}
SELECT last_value AS seqlastvalue, is_called AS seqiscalled
FROM {{ conn|qtIdent(nspname, seqname) }};
{% else %}
SELECT nsp.nspname, cls.relname
FROM pg_catalog.pg_class cls
  JOIN pg_catalog.pg_namespace nsp ON nsp.oid = cls.relnamespace
WHERE cls.oid = {{ seqrelid }}::oid
  AND NOT pg_catalog.pg_is_other_temp_schema(nsp.oid)
  AND pg_catalog.has_sequence_privilege(cls.oid, 'SELECT');
{% endif %}
