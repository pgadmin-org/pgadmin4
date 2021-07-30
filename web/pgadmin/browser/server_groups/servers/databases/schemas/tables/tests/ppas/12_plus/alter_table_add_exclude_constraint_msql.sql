ALTER TABLE IF EXISTS public."table_with_fk_constraints$%{}[]()&*^!@""'`\/#"
    ADD CONSTRAINT ex_constr EXCLUDE USING gist (
    col1 WITH <>);
