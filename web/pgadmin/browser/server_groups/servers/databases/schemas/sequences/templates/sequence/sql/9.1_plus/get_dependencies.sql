SELECT
    CASE WHEN att.attname IS NOT NULL AND ref.relname IS NOT NULL THEN ref.relname || '.' || att.attname
       ELSE ref.relname
    END AS refname,
    d2.refclassid, d1.deptype AS deptype
FROM pg_depend d1
    LEFT JOIN pg_depend d2 ON d1.objid=d2.objid AND d1.refobjid != d2.refobjid
    LEFT JOIN pg_class ref ON ref.oid = d2.refobjid
    LEFT JOIN pg_attribute att ON d2.refobjid=att.attrelid AND d2.refobjsubid=att.attnum
WHERE d1.classid=(SELECT oid FROM pg_class WHERE relname='pg_attrdef')
    AND d2.refobjid NOT IN (SELECT d3.refobjid FROM pg_depend d3 WHERE d3.objid=d1.refobjid)
    AND d1.refobjid={{seid}}::oid