CREATE TABLE testschema.table_with_temporal_cons
(
    room int4range,
    valid_at daterange,
    seat int4range,
    CONSTRAINT pk_table_temporal PRIMARY KEY (room, valid_at WITHOUT OVERLAPS),
    CONSTRAINT uc_table_temporal UNIQUE (seat, valid_at WITHOUT OVERLAPS)
)

TABLESPACE pg_default;
