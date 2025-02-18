CREATE TRIGGER "trig_after_update_events_with_transition_$%{}[]()&*^!@\""'`\\/#"""
    AFTER INSERT
    ON public.tablefortrigger
    REFERENCING NEW TABLE AS newtab OLD TABLE AS oldtab
    FOR EACH ROW
    WHEN (OLD.* IS DISTINCT FROM NEW.*)
    EXECUTE PROCEDURE public."Trig1_$%{}[]()&*^!@""'`\/#"();

COMMENT ON TRIGGER "trig_after_update_events_with_transition_$%{}[]()&*^!@\""'`\\/#""" ON public.tablefortrigger
    IS 'test comment';
