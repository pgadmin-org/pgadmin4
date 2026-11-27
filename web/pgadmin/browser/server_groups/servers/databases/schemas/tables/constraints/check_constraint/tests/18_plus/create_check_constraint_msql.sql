ALTER TABLE public.tableforcon
    ADD CONSTRAINT "Chk_$%{}[]()&*^!@""'`\/#" CHECK (col1 > 1)
    NOT VALID;

COMMENT ON CONSTRAINT "Chk_$%{}[]()&*^!@""'`\/#" ON public.tableforcon
    IS 'Comment for create';
