-- Table: testschema.test_not_enforced_table

-- DROP TABLE IF EXISTS testschema.test_not_enforced_table;

CREATE TABLE IF NOT EXISTS testschema.test_not_enforced_table
(
    id integer,
    ref_id integer,
    CONSTRAINT fk_not_enforced FOREIGN KEY (ref_id)
        REFERENCES testschema.test_first_table (id) MATCH SIMPLE
        ON UPDATE NO ACTION
        ON DELETE NO ACTION
        NOT ENFORCED,
    CONSTRAINT chk_not_enforced CHECK (id > 0) NOT ENFORCED
)

TABLESPACE pg_default;

ALTER TABLE IF EXISTS testschema.test_not_enforced_table
    OWNER to <OWNER>;
