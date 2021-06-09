CREATE TRIGGER "trig_b4r_update_mul_events_$%{}[]()&*^!@""'`\/#"
    BEFORE INSERT OR UPDATE OF col3
    ON public.tablefortrigger
    FOR EACH ROW
    EXECUTE PROCEDURE public."Trig1_$%{}[]()&*^!@""'`\/#"();

COMMENT ON TRIGGER "trig_b4r_update_mul_events_$%{}[]()&*^!@""'`\/#" ON public.tablefortrigger
    IS 'multiple event trigger';
