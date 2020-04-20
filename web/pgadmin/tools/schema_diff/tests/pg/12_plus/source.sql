--
-- PostgreSQL database dump
--

-- Dumped from database version 10.7
-- Dumped by pg_dump version 12beta2

-- Started on 2019-11-01 12:54:15 IST

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 17 (class 2615 OID 139770)
-- Name: source; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA source;


ALTER SCHEMA source OWNER TO postgres;

SET default_tablespace = '';


CREATE EXTENSION btree_gist
    SCHEMA source;

--
-- TOC entry 12272 (class 1259 OID 149205)
-- Name: table_for_partition; Type: TABLE; Schema: source; Owner: postgres
--

CREATE TABLE source.table_for_partition (
    col1 bigint NOT NULL
)
PARTITION BY RANGE (col1);


ALTER TABLE source.table_for_partition OWNER TO postgres;

--
-- TOC entry 12273 (class 1259 OID 149208)
-- Name: part1; Type: TABLE; Schema: source; Owner: postgres
--

CREATE TABLE source.part1 (
    col1 bigint NOT NULL
);
ALTER TABLE ONLY source.table_for_partition ATTACH PARTITION source.part1 FOR VALUES FROM ('1') TO ('23');


ALTER TABLE source.part1 OWNER TO postgres;

--
-- TOC entry 12274 (class 1259 OID 149213)
-- Name: table_for_partition_1; Type: TABLE; Schema: source; Owner: postgres
--

CREATE TABLE source.table_for_partition_1 (
    col1 bigint
)
PARTITION BY RANGE (col1);


ALTER TABLE source.table_for_partition_1 OWNER TO postgres;

--
-- TOC entry 12275 (class 1259 OID 149216)
-- Name: part3; Type: TABLE; Schema: source; Owner: postgres
--

CREATE TABLE source.part3 (
    col1 bigint
);
ALTER TABLE ONLY source.table_for_partition_1 ATTACH PARTITION source.part3 FOR VALUES FROM ('1') TO ('10');


ALTER TABLE source.part3 OWNER TO postgres;

--
-- TOC entry 12276 (class 1259 OID 149219)
-- Name: part4; Type: TABLE; Schema: source; Owner: postgres
--

CREATE TABLE source.part4 (
    col1 bigint
);
ALTER TABLE ONLY source.table_for_partition_1 ATTACH PARTITION source.part4 FOR VALUES FROM ('11') TO ('20');


ALTER TABLE source.part4 OWNER TO postgres;

--
-- TOC entry 12258 (class 1259 OID 148963)
-- Name: table_for_column; Type: TABLE; Schema: source; Owner: postgres
--

CREATE TABLE source.table_for_column (
    col1 bigint NOT NULL,
    col2 text,
    col3 text
);


ALTER TABLE source.table_for_column OWNER TO postgres;

--
-- TOC entry 12256 (class 1259 OID 148895)
-- Name: table_for_constraints; Type: TABLE; Schema: source; Owner: postgres
--

CREATE TABLE source.table_for_constraints (
    col1 integer NOT NULL,
    col2 text
);


ALTER TABLE source.table_for_constraints OWNER TO postgres;

--
-- TOC entry 61066 (class 0 OID 0)
-- Dependencies: 12256
-- Name: TABLE table_for_constraints; Type: COMMENT; Schema: source; Owner: postgres
--

COMMENT ON TABLE source.table_for_constraints IS 'comments';


--
-- TOC entry 12262 (class 1259 OID 149004)
-- Name: table_for_identical; Type: TABLE; Schema: source; Owner: postgres
--

CREATE TABLE source.table_for_identical (
    col1 integer NOT NULL,
    col2 text
);


ALTER TABLE source.table_for_identical OWNER TO postgres;

--
-- TOC entry 12260 (class 1259 OID 148977)
-- Name: table_for_index; Type: TABLE; Schema: source; Owner: postgres
--

CREATE TABLE source.table_for_index (
    col1 integer NOT NULL,
    col2 text
);


ALTER TABLE source.table_for_index OWNER TO postgres;

--
-- TOC entry 12269 (class 1259 OID 149128)
-- Name: table_for_primary_key; Type: TABLE; Schema: source; Owner: postgres
--

CREATE TABLE source.table_for_primary_key (
    col1 integer NOT NULL,
    col2 text NOT NULL
);


ALTER TABLE source.table_for_primary_key OWNER TO postgres;

--
-- TOC entry 12264 (class 1259 OID 149024)
-- Name: table_for_rule; Type: TABLE; Schema: source; Owner: postgres
--

CREATE TABLE source.table_for_rule (
    col1 bigint NOT NULL,
    col2 text
);


ALTER TABLE source.table_for_rule OWNER TO postgres;

--
-- TOC entry 12266 (class 1259 OID 149048)
-- Name: table_for_trigger; Type: TABLE; Schema: source; Owner: postgres
--

CREATE TABLE source.table_for_trigger (
    col1 bigint NOT NULL,
    col2 text
);


ALTER TABLE source.table_for_trigger OWNER TO postgres;

--
-- TOC entry 56893 (class 2606 OID 148904)
-- Name: table_for_constraints Exclusion; Type: CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.table_for_constraints
    ADD CONSTRAINT "Exclusion" EXCLUDE USING gist (col2 WITH <>) WITH (fillfactor='12') WHERE ((col1 > 1)) DEFERRABLE INITIALLY DEFERRED;


--
-- TOC entry 61067 (class 0 OID 0)
-- Dependencies: 56893
-- Name: CONSTRAINT "Exclusion" ON table_for_constraints; Type: COMMENT; Schema: source; Owner: postgres
--

COMMENT ON CONSTRAINT "Exclusion" ON source.table_for_constraints IS 'comments';


--
-- TOC entry 56891 (class 2606 OID 148911)
-- Name: table_for_constraints check_con; Type: CHECK CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE source.table_for_constraints
    ADD CONSTRAINT check_con CHECK ((col1 > 10)) NOT VALID;


--
-- TOC entry 61068 (class 0 OID 0)
-- Dependencies: 56891
-- Name: CONSTRAINT check_con ON table_for_constraints; Type: COMMENT; Schema: source; Owner: postgres
--

COMMENT ON CONSTRAINT check_con ON source.table_for_constraints IS 'coment';


--
-- TOC entry 56899 (class 2606 OID 148970)
-- Name: table_for_column table_for_column_pkey; Type: CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.table_for_column
    ADD CONSTRAINT table_for_column_pkey PRIMARY KEY (col1);


--
-- TOC entry 56895 (class 2606 OID 148902)
-- Name: table_for_constraints table_for_constraints_pkey; Type: CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.table_for_constraints
    ADD CONSTRAINT table_for_constraints_pkey PRIMARY KEY (col1);


--
-- TOC entry 56904 (class 2606 OID 148984)
-- Name: table_for_index table_for_index_pkey; Type: CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.table_for_index
    ADD CONSTRAINT table_for_index_pkey PRIMARY KEY (col1);


--
-- TOC entry 56913 (class 2606 OID 149135)
-- Name: table_for_primary_key table_for_primary_key_pkey; Type: CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.table_for_primary_key
    ADD CONSTRAINT table_for_primary_key_pkey PRIMARY KEY (col1, col2);


--
-- TOC entry 56909 (class 2606 OID 149031)
-- Name: table_for_rule table_for_rule_pkey; Type: CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.table_for_rule
    ADD CONSTRAINT table_for_rule_pkey PRIMARY KEY (col1);


--
-- TOC entry 56907 (class 2606 OID 149011)
-- Name: table_for_identical table_for_table_for_identical_pkey; Type: CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.table_for_identical
    ADD CONSTRAINT table_for_table_for_identical_pkey PRIMARY KEY (col1);


--
-- TOC entry 56911 (class 2606 OID 149055)
-- Name: table_for_trigger table_for_trigger_pkey; Type: CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.table_for_trigger
    ADD CONSTRAINT table_for_trigger_pkey PRIMARY KEY (col1);


--
-- TOC entry 56897 (class 2606 OID 148913)
-- Name: table_for_constraints unique; Type: CONSTRAINT; Schema: source; Owner: postgres
--

ALTER TABLE ONLY source.table_for_constraints
    ADD CONSTRAINT "unique" UNIQUE (col1);


--
-- TOC entry 61069 (class 0 OID 0)
-- Dependencies: 56897
-- Name: CONSTRAINT "unique" ON table_for_constraints; Type: COMMENT; Schema: source; Owner: postgres
--

COMMENT ON CONSTRAINT "unique" ON source.table_for_constraints IS 'cmnt';


--
-- TOC entry 56900 (class 1259 OID 149023)
-- Name: index1; Type: INDEX; Schema: source; Owner: postgres
--

CREATE INDEX index1 ON source.table_for_index USING btree (col2 varchar_pattern_ops);


--
-- TOC entry 56905 (class 1259 OID 149012)
-- Name: index_identical; Type: INDEX; Schema: source; Owner: postgres
--

CREATE INDEX index_identical ON source.table_for_identical USING btree (col2 text_pattern_ops);


--
-- TOC entry 56901 (class 1259 OID 149211)
-- Name: index_same; Type: INDEX; Schema: source; Owner: postgres
--

CREATE INDEX index_same ON source.table_for_index USING btree (col2 text_pattern_ops);


--
-- TOC entry 56902 (class 1259 OID 149022)
-- Name: index_source; Type: INDEX; Schema: source; Owner: postgres
--

CREATE INDEX index_source ON source.table_for_index USING btree (col2 text_pattern_ops);


--
-- TOC entry 61044 (class 2618 OID 149032)
-- Name: table_for_rule rule1; Type: RULE; Schema: source; Owner: postgres
--

CREATE RULE rule1 AS
    ON UPDATE TO source.table_for_rule DO INSTEAD NOTHING;


--
-- TOC entry 61070 (class 0 OID 0)
-- Dependencies: 61044
-- Name: RULE rule1 ON table_for_rule; Type: COMMENT; Schema: source; Owner: postgres
--

COMMENT ON RULE rule1 ON source.table_for_rule IS 'comments';


--
-- TOC entry 61045 (class 2618 OID 149033)
-- Name: table_for_rule rule2; Type: RULE; Schema: source; Owner: postgres
--

CREATE RULE rule2 AS
    ON INSERT TO source.table_for_rule DO NOTHING;

--
-- TOC entry 12283 (class 1259 OID 347818)
-- Name: test view; Type: VIEW; Schema: source; Owner: postgres
--

CREATE VIEW source."test view" AS
 SELECT pg_class.relname,
    pg_class.relnamespace,
    pg_class.reltype,
    pg_class.reloftype,
    pg_class.relowner,
    pg_class.relam,
    pg_class.relfilenode,
    pg_class.reltablespace,
    pg_class.relpages
   FROM pg_class
 LIMIT 10;


ALTER TABLE source."test view" OWNER TO postgres;

--
-- TOC entry 12286 (class 1259 OID 347832)
-- Name: test view f; Type: VIEW; Schema: source; Owner: postgres
--

CREATE VIEW source."test view f" WITH (security_barrier='false') AS
 SELECT 2;


ALTER TABLE source."test view f" OWNER TO postgres;

--
-- TOC entry 61111 (class 0 OID 0)
-- Dependencies: 12286
-- Name: VIEW "test view f"; Type: COMMENT; Schema: source; Owner: postgres
--

COMMENT ON VIEW source."test view f" IS 'cmn';

--
-- TOC entry 223 (class 1255 OID 67206)
-- Name: dodaj_klijenta(character varying, character varying, character varying, character varying, integer, character varying, character varying, character varying, boolean, boolean, character varying, character varying, character varying, character varying, numeric, character varying); Type: PROCEDURE; Schema: public; Owner: postgres
--

CREATE PROCEDURE source.dodaj_klijenta(v_naziv character varying, v_oib character varying, v_pdv_id character varying, v_adresa character varying, v_mjesto integer, v_drzava character varying, v_tip_p_sub character varying, v_vlasnik character varying, v_pdv boolean, v_fisk boolean, v_iban character varying, v_k_osoba character varying, v_email character varying, v_br_tel character varying, v_radna_god numeric, v_schema character varying)
    LANGUAGE sql
    AS $$select 1;$$;


ALTER PROCEDURE source.dodaj_klijenta(v_naziv character varying, v_oib character varying, v_pdv_id character varying, v_adresa character varying, v_mjesto integer, v_drzava character varying, v_tip_p_sub character varying, v_vlasnik character varying, v_pdv boolean, v_fisk boolean, v_iban character varying, v_k_osoba character varying, v_email character varying, v_br_tel character varying, v_radna_god numeric, v_schema character varying) OWNER TO postgres;

--
-- TOC entry 220 (class 1255 OID 67205)
-- Name: proc1(bigint); Type: PROCEDURE; Schema: source; Owner: postgres
--

CREATE PROCEDURE source.proc1(arg1 bigint)
    LANGUAGE sql
    AS $$select 1;$$;


ALTER PROCEDURE source.proc1(arg1 bigint) OWNER TO postgres;

-- Collation scripts
CREATE COLLATION source.coll_src
    FROM pg_catalog."POSIX";

ALTER COLLATION source.coll_src
    OWNER TO postgres;

COMMENT ON COLLATION source.coll_src
    IS 'Test Comment';

CREATE COLLATION source.coll_diff
    (LC_COLLATE = 'POSIX', LC_CTYPE = 'POSIX');

ALTER COLLATION source.coll_diff
    OWNER TO postgres;

COMMENT ON COLLATION source.coll_diff
    IS 'Test Comment';

-- FTS Configuration scripts
CREATE TEXT SEARCH CONFIGURATION source.fts_con_src (
    COPY=german
);

ALTER TEXT SEARCH CONFIGURATION source.fts_con_src OWNER TO postgres;

COMMENT ON TEXT SEARCH CONFIGURATION source.fts_con_src
    IS 'Test Comment';


CREATE TEXT SEARCH CONFIGURATION source.fts_con_diff (
	PARSER = default
);
ALTER TEXT SEARCH CONFIGURATION source.fts_con_diff ADD MAPPING FOR asciiword WITH german_stem;
ALTER TEXT SEARCH CONFIGURATION source.fts_con_diff ADD MAPPING FOR email WITH simple;
ALTER TEXT SEARCH CONFIGURATION source.fts_con_diff ADD MAPPING FOR hword WITH dutch_stem;

-- FTS Dictionary scripts
CREATE TEXT SEARCH DICTIONARY source.fts_dict_src (
    TEMPLATE = simple,
    stopwords = 'english'
);

COMMENT ON TEXT SEARCH DICTIONARY source.fts_dict_src
    IS 'Test Comment';

CREATE TEXT SEARCH DICTIONARY source.fts_dict_diff (
    TEMPLATE = simple,
    stopwords = 'english'
);

COMMENT ON TEXT SEARCH DICTIONARY source.fts_dict_diff
    IS 'Test Comment';

-- FTS Parser scripts
CREATE TEXT SEARCH PARSER source.fts_par_src (
    START = prsd_start,
    GETTOKEN = prsd_nexttoken,
    END = prsd_end,
    LEXTYPES = prsd_lextype);

COMMENT ON TEXT SEARCH PARSER source.fts_par_src
      IS 'Test Comment';

CREATE TEXT SEARCH PARSER source.fts_par_diff (
    START = prsd_start,
    GETTOKEN = prsd_nexttoken,
    END = prsd_end,
    LEXTYPES = prsd_lextype);

COMMENT ON TEXT SEARCH PARSER source.fts_par_diff
      IS 'Test Comment';

-- FTS Template scripts
CREATE TEXT SEARCH TEMPLATE source.fts_templ_src (
    INIT = dispell_init,
    LEXIZE = dispell_lexize
);

COMMENT ON TEXT SEARCH TEMPLATE source.fts_templ_src IS 'Test Comment';

CREATE TEXT SEARCH TEMPLATE source.fts_templ_diff (
    INIT = dispell_init,
    LEXIZE = dispell_lexize
);

COMMENT ON TEXT SEARCH TEMPLATE source.fts_templ_diff IS 'Test Comment';

-- Domain and Domain Constraint script
CREATE DOMAIN source.dom_src
    AS bigint
    DEFAULT 100
    NOT NULL;

ALTER DOMAIN source.dom_src OWNER TO postgres;

ALTER DOMAIN source.dom_src
    ADD CONSTRAINT con_src CHECK (VALUE <> 100);

CREATE DOMAIN source.dom_cons_diff
    AS bigint
    DEFAULT 100
    NOT NULL;

ALTER DOMAIN source.dom_cons_diff OWNER TO postgres;

ALTER DOMAIN source.dom_cons_diff
    ADD CONSTRAINT cons_diff_1 CHECK (VALUE <> 50);

ALTER DOMAIN source.dom_cons_diff
    ADD CONSTRAINT cons_src_only CHECK (VALUE <> 25);

CREATE DOMAIN source.dom_type_diff
    AS character varying(40)
    COLLATE pg_catalog."POSIX";

ALTER DOMAIN source.dom_type_diff OWNER TO postgres;

ALTER DOMAIN source.dom_type_diff
    ADD CONSTRAINT cons1 CHECK (VALUE::text <> 'pgAdmin3'::text);

ALTER DOMAIN source.dom_type_diff
    ADD CONSTRAINT cons2 CHECK (VALUE::text <> 'pgAdmin4'::text);

COMMENT ON DOMAIN source.dom_type_diff
    IS 'Test comment';

-- Type Script composite type
CREATE TYPE source.typ_comp_src AS
(
	m1 bit(5),
	m2 text COLLATE pg_catalog."POSIX"
);
ALTER TYPE source.typ_comp_src
    OWNER TO postgres;

CREATE TYPE source.typ_comp_diff AS
(
	m1 numeric(5,2),
	m3 character varying(30) COLLATE pg_catalog."C"
);
ALTER TYPE source.typ_comp_diff
    OWNER TO postgres;
COMMENT ON TYPE source.typ_comp_diff
    IS 'Test Comment';
GRANT USAGE ON TYPE source.typ_comp_diff TO PUBLIC;
GRANT USAGE ON TYPE source.typ_comp_diff TO pg_monitor WITH GRANT OPTION;
GRANT USAGE ON TYPE source.typ_comp_diff TO postgres;

CREATE TYPE source.typ_comp_diff_no_column AS
(
);
ALTER TYPE source.typ_comp_diff_no_column
    OWNER TO postgres;

-- Type Script ENUM type
CREATE TYPE source.typ_enum_src AS ENUM
    ('test_enum');
ALTER TYPE source.typ_enum_src
    OWNER TO postgres;

CREATE TYPE source.typ_enum_diff AS ENUM
    ('test_enum', 'test_enum_1');
ALTER TYPE source.typ_enum_diff
    OWNER TO postgres;
COMMENT ON TYPE source.typ_enum_diff
    IS 'Test Comment';
GRANT USAGE ON TYPE source.typ_enum_src TO pg_monitor WITH GRANT OPTION;

-- Type Script RANGE type
CREATE TYPE source.typ_range_src AS RANGE
(
    SUBTYPE=text,
    COLLATION = pg_catalog."POSIX",
    SUBTYPE_OPCLASS = text_ops
);
ALTER TYPE source.typ_range_src
    OWNER TO postgres;

CREATE TYPE source.typ_range_col_diff AS RANGE
(
    SUBTYPE=text,
    COLLATION = pg_catalog."C",
    SUBTYPE_OPCLASS = text_ops
);
ALTER TYPE source.typ_range_col_diff
    OWNER TO pg_monitor;
COMMENT ON TYPE source.typ_range_col_diff
    IS 'Test Comment';
GRANT USAGE ON TYPE source.typ_range_col_diff TO PUBLIC;
GRANT USAGE ON TYPE source.typ_range_col_diff TO pg_monitor WITH GRANT OPTION;

CREATE TYPE source.typ_range_subtype_diff AS RANGE
(
    SUBTYPE=bpchar,
    COLLATION = pg_catalog."POSIX"
);
ALTER TYPE source.typ_range_subtype_diff
    OWNER TO postgres;

-- Type Script SHELL type
CREATE TYPE source.typ_shell_src;
ALTER TYPE source.typ_shell_src
    OWNER TO postgres;

CREATE TYPE source.typ_shell_diff;
ALTER TYPE source.typ_shell_diff
    OWNER TO postgres;
COMMENT ON TYPE source.typ_shell_diff
    IS 'Test Comment';

-- Type script to test when Type is different
CREATE TYPE source.typ_comp_range_diff AS
(
	m1 bigint,
	m2 text[] COLLATE pg_catalog."POSIX"
);
ALTER TYPE source.typ_comp_range_diff
    OWNER TO postgres;

CREATE TYPE source.typ_comp_enum_diff AS
(
	m1 bigint,
	m2 text[] COLLATE pg_catalog."POSIX"
);
ALTER TYPE source.typ_comp_range_diff
    OWNER TO postgres;

CREATE TYPE source.typ_range_comp_diff AS RANGE
(
    SUBTYPE=text,
    COLLATION = pg_catalog."C",
    SUBTYPE_OPCLASS = text_ops
);
ALTER TYPE source.typ_range_comp_diff
    OWNER TO postgres;

CREATE TYPE source.typ_range_enum_diff AS RANGE
(
    SUBTYPE=text,
    COLLATION = pg_catalog."C",
    SUBTYPE_OPCLASS = text_ops
);
ALTER TYPE source.typ_range_enum_diff
    OWNER TO postgres;

CREATE TYPE source.typ_enum_comp_diff AS ENUM
    ('test_enum', 'test_enum_1');
ALTER TYPE source.typ_enum_comp_diff
    OWNER TO postgres;

CREATE TYPE source.typ_enum_range_diff AS ENUM
    ('test_enum', 'test_enum_1');
ALTER TYPE source.typ_enum_range_diff
    OWNER TO postgres;

-- Sequences Script
CREATE SEQUENCE source.seq_src
    CYCLE
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 3
    CACHE 6;
ALTER SEQUENCE source.seq_src
    OWNER TO postgres;
COMMENT ON SEQUENCE source.seq_src
    IS 'Test Comment';
GRANT ALL ON SEQUENCE source.seq_src TO PUBLIC;
GRANT ALL ON SEQUENCE source.seq_src TO postgres;

CREATE SEQUENCE source.seq_diff_comment_acl
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;
ALTER SEQUENCE source.seq_diff_comment_acl
    OWNER TO postgres;
COMMENT ON SEQUENCE source.seq_diff_comment_acl
    IS 'Test Comment';
GRANT ALL ON SEQUENCE source.seq_diff_comment_acl TO PUBLIC;
GRANT ALL ON SEQUENCE source.seq_diff_comment_acl TO postgres;

CREATE SEQUENCE source.seq_diff_comment_acl_remove
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;
ALTER SEQUENCE source.seq_diff_comment_acl_remove
    OWNER TO postgres;

CREATE SEQUENCE source.seq_diff
    CYCLE
    INCREMENT 3
    START 3
    MINVALUE 3
    MAXVALUE 100
    CACHE 2;
ALTER SEQUENCE source.seq_diff
    OWNER TO postgres;

CREATE SEQUENCE source.seq_start_diff
    INCREMENT 5
    START 3
    MINVALUE 3
    MAXVALUE 20;
ALTER SEQUENCE source.seq_start_diff
    OWNER TO postgres;

-- Foreign Data Wrapper to test foreign table
CREATE FOREIGN DATA WRAPPER test_fdw_for_foreign_table;
ALTER FOREIGN DATA WRAPPER test_fdw_for_foreign_table
    OWNER TO postgres;

-- Foreign Server to test foreign table
CREATE SERVER test_fs_for_foreign_table
    FOREIGN DATA WRAPPER test_fdw_for_foreign_table;
ALTER SERVER test_fs_for_foreign_table
    OWNER TO postgres;
CREATE SERVER test_fs2_for_foreign_table
    FOREIGN DATA WRAPPER test_fdw_for_foreign_table;
ALTER SERVER test_fs2_for_foreign_table
    OWNER TO postgres;

-- Table to test inheritance in foreign table
CREATE TABLE public.test_table_for_foreign_table
(
    tid bigint NOT NULL,
    tname text COLLATE pg_catalog."default",
    CONSTRAINT test_table_for_foreign_table_pkey PRIMARY KEY (tid)
)
WITH (
    OIDS = FALSE
)
TABLESPACE pg_default;
ALTER TABLE public.test_table_for_foreign_table
    OWNER to postgres;

CREATE FOREIGN TABLE source.ft_src(
    fid bigint NULL,
    fname text NULL COLLATE pg_catalog."default"
)
    SERVER test_fs_for_foreign_table;
ALTER FOREIGN TABLE source.ft_src
    OWNER TO postgres;
ALTER FOREIGN TABLE source.ft_src
    ADD CONSTRAINT fcheck CHECK ((fid > 1000)) NO INHERIT;
COMMENT ON FOREIGN TABLE source.ft_src
    IS 'Test Comment';
GRANT INSERT ON TABLE source.ft_src TO pg_monitor;
GRANT ALL ON TABLE source.ft_src TO postgres;

CREATE FOREIGN TABLE source.ft_diff_col(
    fid bigint NULL,
    fname text NULL COLLATE pg_catalog."default",
    fcity character varying(40) NULL COLLATE pg_catalog."POSIX"
)
    SERVER test_fs_for_foreign_table;
ALTER FOREIGN TABLE source.ft_diff_col
    OWNER TO postgres;
ALTER FOREIGN TABLE source.ft_diff_col
    ADD CONSTRAINT fcheck CHECK ((fid > 1000)) NO INHERIT;
COMMENT ON FOREIGN TABLE source.ft_diff_col
    IS 'Test Comment';

CREATE FOREIGN TABLE source.ft_diff_const(
    fid bigint NULL,
    fname text NULL COLLATE pg_catalog."default"
)
    SERVER test_fs_for_foreign_table;
ALTER FOREIGN TABLE source.ft_diff_const
    OWNER TO postgres;

ALTER FOREIGN TABLE source.ft_diff_const
    ADD CONSTRAINT fcheck CHECK ((fid > 1000)) NO INHERIT;
ALTER FOREIGN TABLE source.ft_diff_const
    ADD CONSTRAINT fcheck1 CHECK ((fid > 1000)) NO INHERIT NOT VALID;
ALTER FOREIGN TABLE source.ft_diff_const
    ADD CONSTRAINT fcheck2 CHECK ((fid > 20));
ALTER FOREIGN TABLE source.ft_diff_const
    ADD CONSTRAINT fcheck_src CHECK ((fid > 50));

GRANT INSERT ON TABLE source.ft_diff_const TO pg_monitor;
GRANT ALL ON TABLE source.ft_diff_const TO postgres;

CREATE FOREIGN TABLE source.ft_diff_opt(
    fid bigint NULL,
    fname text NULL COLLATE pg_catalog."default"
)
    SERVER test_fs_for_foreign_table
    OPTIONS (opt1 'val1', opt2 'val20', opt_src 'val_src');
ALTER FOREIGN TABLE source.ft_diff_opt
    OWNER TO postgres;

CREATE FOREIGN TABLE source.ft_diff_foreign_server(
    fid bigint NULL,
    fname text NULL COLLATE pg_catalog."default"
)
    SERVER test_fs_for_foreign_table;
ALTER FOREIGN TABLE source.ft_diff_foreign_server
    OWNER TO postgres;

CREATE FOREIGN TABLE source.ft_diff_foreign_server_1(
    fid bigint NULL,
    fname text NULL COLLATE pg_catalog."default"
)
    SERVER test_fs_for_foreign_table
    OPTIONS (opt1 'val1');
ALTER FOREIGN TABLE source.ft_diff_foreign_server_1
    OWNER TO postgres;
ALTER FOREIGN TABLE source.ft_diff_foreign_server_1
    ADD CONSTRAINT cs1 CHECK ((fid > 200)) NO INHERIT;

-- Test for RM #5350
CREATE TABLE source.events_transactions
(
    event_code integer,
    numerator integer,
    account_token text COLLATE pg_catalog."default",
    transaction_dt timestamp without time zone,
    payment_method integer,
    payment_pin integer,
    approval text COLLATE pg_catalog."default",
    amount integer,
    file_dt timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    file_name character varying(256) COLLATE pg_catalog."default",
    transfer_dt timestamp without time zone,
    transaction_type integer
);
