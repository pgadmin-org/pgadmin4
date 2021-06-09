CREATE TRIGGER "trig_be4r_update_$%{}[]()&*^!@""'`\/#"
    BEFORE UPDATE OF col1
    ON public.tablefortrigger
    FOR EACH ROW
    WHEN (OLD.col2 IS DISTINCT FROM NEW.col2)
    EXECUTE FUNCTION public."Trig1_$%{}[]()&*^!@""'`\/#"();

COMMENT ON TRIGGER "trig_be4r_update_$%{}[]()&*^!@""'`\/#" ON public.tablefortrigger
    IS 'test comment';
