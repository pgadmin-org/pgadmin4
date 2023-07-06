ALTER INDEX IF EXISTS public."Idx_$%{}[]()&*^!@""'`\/#"
    RENAME TO "Idx1_$%{}[]()&*^!@""'`\/#";

ALTER INDEX IF EXISTS public."Idx1_$%{}[]()&*^!@""'`\/#"
    SET (fillfactor=10);


ALTER TABLE IF EXISTS public.test_table_for_indexes
    CLUSTER ON "Idx1_$%{}[]()&*^!@""'`\/#";

COMMENT ON INDEX public."Idx1_$%{}[]()&*^!@""'`\/#"
    IS 'Test Comment';
