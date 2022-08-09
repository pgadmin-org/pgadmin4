CREATE SUBSCRIPTION test_create_subscription
    CONNECTION 'host=localhost port=5432 user=postgres dbname=postgres password=xxxxxx'
    PUBLICATION sample__1
    WITH (connect = false, enabled = false, create_slot = false, slot_name = None, synchronous_commit = 'off');
