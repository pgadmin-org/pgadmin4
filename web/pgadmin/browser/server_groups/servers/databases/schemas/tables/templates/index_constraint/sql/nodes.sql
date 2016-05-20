SELECT cls.oid, cls.relname as name
FROM pg_index idx
JOIN pg_class cls ON cls.oid=indexrelid
LEFT JOIN pg_depend dep ON (dep.classid = cls.tableoid AND
                            dep.objid = cls.oid AND
                            dep.refobjsubid = '0' AND
                            dep.refclassid=(SELECT oid
                                            FROM pg_class
                                            WHERE relname='pg_constraint') AND
                            dep.deptype='i')
LEFT OUTER JOIN pg_constraint con ON (con.tableoid = dep.refclassid AND
                                      con.oid = dep.refobjid)
WHERE indrelid = {{tid}}::oid
AND contype='{{constraint_type}}'