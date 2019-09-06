ALTER INDEX public."Idx_$%{}[]()&*^!@""'`\/#"
    RENAME TO "Idx1_$%{}[]()&*^!@""'`\/#";

ALTER INDEX public."Idx1_$%{}[]()&*^!@""'`\/#"
    SET (FILLFACTOR=10);

ALTER TABLE public.test_table_for_indexes
    CLUSTER ON "Idx1_$%{}[]()&*^!@""'`\/#";

COMMENT ON INDEX public."Idx1_$%{}[]()&*^!@""'`\/#"
    IS 'Test Comment';
