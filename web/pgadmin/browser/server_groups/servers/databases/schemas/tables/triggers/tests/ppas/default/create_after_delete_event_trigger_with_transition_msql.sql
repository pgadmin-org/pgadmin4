CREATE TRIGGER "trig_after_delete_events_with_transition_$%{}[]()&*^!@""'`\/#"
    AFTER DELETE
    ON public.tablefortrigger
    REFERENCING OLD TABLE AS oldtab
    FOR EACH ROW
    EXECUTE PROCEDURE public."Trig1_$%{}[]()&*^!@""'`\/#"();

COMMENT ON TRIGGER "trig_after_delete_events_with_transition_$%{}[]()&*^!@""'`\/#" ON public.tablefortrigger
    IS 'test comment';
