CREATE TRIGGER "trig_after_insert_events_with_transition_$%{}[]()&*^!@""'`\/#"
    AFTER INSERT
    ON public.tablefortrigger
    REFERENCING NEW TABLE AS inserted
    FOR EACH ROW
    EXECUTE PROCEDURE public."Trig1_$%{}[]()&*^!@""'`\/#"();

COMMENT ON TRIGGER "trig_after_insert_events_with_transition_$%{}[]()&*^!@""'`\/#" ON public.tablefortrigger
    IS 'test comment';
