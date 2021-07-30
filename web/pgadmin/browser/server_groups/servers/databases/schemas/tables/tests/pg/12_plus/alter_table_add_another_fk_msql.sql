ALTER TABLE IF EXISTS public."table_with_fk_constraints$%{}[]()&*^!@""'`\/#"
    ADD CONSTRAINT fk2 FOREIGN KEY (col2)
    REFERENCES public.fk_reference_tbl (name)
    ON UPDATE NO ACTION
    ON DELETE NO ACTION
    NOT VALID;
