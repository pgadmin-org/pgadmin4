SELECT op.oid, pg_catalog.pg_get_userbyid(op.oprowner) as owner,
    CASE WHEN lt.typname IS NOT NULL AND rt.typname IS NOT NULL THEN
		op.oprname || ' (' || pg_catalog.format_type(lt.oid, NULL) || ', ' || pg_catalog.format_type(rt.oid, NULL) || ')'
	 WHEN lt.typname IS NULL AND rt.typname IS NOT NULL THEN
	    op.oprname || ' (' || pg_catalog.format_type(rt.oid, NULL) || ')'
	 WHEN lt.typname IS NOT NULL AND rt.typname IS NULL THEN
	    op.oprname || ' (' || pg_catalog.format_type(lt.oid, NULL) || ')'
	 ELSE op.oprname || '()'
END as name,
lt.typname as lefttype, rt.typname as righttype
FROM pg_catalog.pg_operator op
  LEFT OUTER JOIN pg_catalog.pg_type lt ON lt.oid=op.oprleft
  LEFT OUTER JOIN pg_catalog.pg_type rt ON rt.oid=op.oprright
  JOIN pg_catalog.pg_type et on et.oid=op.oprresult
  LEFT OUTER JOIN pg_catalog.pg_operator co ON co.oid=op.oprcom
  LEFT OUTER JOIN pg_catalog.pg_operator ne ON ne.oid=op.oprnegate
  LEFT OUTER JOIN pg_catalog.pg_description des ON (des.objoid=op.oid AND des.classoid='pg_operator'::regclass)
{% if scid %}
  WHERE op.oprnamespace = {{scid}}::oid
{% elif opid %}
  WHERE op.oid = {{opid}}::oid
{% endif %}
ORDER BY op.oprname;
