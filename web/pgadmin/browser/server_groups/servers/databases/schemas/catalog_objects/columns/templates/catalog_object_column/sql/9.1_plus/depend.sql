SELECT
    ref.relname AS refname, d2.refclassid, dep.deptype AS deptype
FROM pg_depend dep
    LEFT JOIN pg_depend d2 ON dep.objid=d2.objid AND dep.refobjid != d2.refobjid
    LEFT JOIN pg_class ref ON ref.oid=d2.refobjid
    LEFT JOIN pg_attribute att ON d2.refclassid=att.attrelid AND d2.refobjsubid=att.attnum
{{ where }} AND
    dep.classid=(SELECT oid FROM pg_class WHERE relname='pg_attrdef') AND
    dep.refobjid NOT IN (SELECT d3.refobjid FROM pg_depend d3 WHERE d3.objid=d2.refobjid)
ORDER BY refname;
