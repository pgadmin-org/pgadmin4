ALTER TABLE testschema.tablefor_unique_cons
    ADD CONSTRAINT "UC_$%{}[]()&*^!@""'`\/#" UNIQUE USING INDEX uindex;

COMMENT ON CONSTRAINT "UC_$%{}[]()&*^!@""'`\/#" ON testschema.tablefor_unique_cons
    IS 'Comment for create';
