CREATE OR REPLACE TRIGGER "trig_test_$%{}[]()&*^!@""'`\/#"
    BEFORE INSERT
    ON public.tablefortrigger
    FOR EACH ROW
    EXECUTE FUNCTION public."Trig1_$%{}[]()&*^!@""'`\/#"();

COMMENT ON TRIGGER "trig_test_$%{}[]()&*^!@""'`\/#" ON public.tablefortrigger
    IS 'test comment';
