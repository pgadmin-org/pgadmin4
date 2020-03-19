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
-- Name: source; Type: SCHEMA; Schema: -; Owner: enterprisedb
--

CREATE SCHEMA source;


ALTER SCHEMA source OWNER TO enterprisedb;

SET default_tablespace = '';


CREATE EXTENSION btree_gist
    SCHEMA source;

--
-- TOC entry 12272 (class 1259 OID 149205)
-- Name: table_for_partition; Type: TABLE; Schema: source; Owner: enterprisedb
--

CREATE TABLE source.table_for_partition (
    col1 bigint NOT NULL
)
PARTITION BY RANGE (col1);


ALTER TABLE source.table_for_partition OWNER TO enterprisedb;

--
-- TOC entry 12273 (class 1259 OID 149208)
-- Name: part1; Type: TABLE; Schema: source; Owner: enterprisedb
--

CREATE TABLE source.part1 (
    col1 bigint NOT NULL
);
ALTER TABLE ONLY source.table_for_partition ATTACH PARTITION source.part1 FOR VALUES FROM ('1') TO ('23');


ALTER TABLE source.part1 OWNER TO enterprisedb;

--
-- TOC entry 12274 (class 1259 OID 149213)
-- Name: table_for_partition_1; Type: TABLE; Schema: source; Owner: enterprisedb
--

CREATE TABLE source.table_for_partition_1 (
    col1 bigint
)
PARTITION BY RANGE (col1);


ALTER TABLE source.table_for_partition_1 OWNER TO enterprisedb;

--
-- TOC entry 12275 (class 1259 OID 149216)
-- Name: part3; Type: TABLE; Schema: source; Owner: enterprisedb
--

CREATE TABLE source.part3 (
    col1 bigint
);
ALTER TABLE ONLY source.table_for_partition_1 ATTACH PARTITION source.part3 FOR VALUES FROM ('1') TO ('10');


ALTER TABLE source.part3 OWNER TO enterprisedb;

--
-- TOC entry 12276 (class 1259 OID 149219)
-- Name: part4; Type: TABLE; Schema: source; Owner: enterprisedb
--

CREATE TABLE source.part4 (
    col1 bigint
);
ALTER TABLE ONLY source.table_for_partition_1 ATTACH PARTITION source.part4 FOR VALUES FROM ('11') TO ('20');


ALTER TABLE source.part4 OWNER TO enterprisedb;

--
-- TOC entry 12258 (class 1259 OID 148963)
-- Name: table_for_column; Type: TABLE; Schema: source; Owner: enterprisedb
--

CREATE TABLE source.table_for_column (
    col1 bigint NOT NULL,
    col2 text,
    col3 text
);


ALTER TABLE source.table_for_column OWNER TO enterprisedb;

--
-- TOC entry 12256 (class 1259 OID 148895)
-- Name: table_for_constraints; Type: TABLE; Schema: source; Owner: enterprisedb
--

CREATE TABLE source.table_for_constraints (
    col1 integer NOT NULL,
    col2 text
);


ALTER TABLE source.table_for_constraints OWNER TO enterprisedb;

--
-- TOC entry 61066 (class 0 OID 0)
-- Dependencies: 12256
-- Name: TABLE table_for_constraints; Type: COMMENT; Schema: source; Owner: enterprisedb
--

COMMENT ON TABLE source.table_for_constraints IS 'comments';


--
-- TOC entry 12262 (class 1259 OID 149004)
-- Name: table_for_identical; Type: TABLE; Schema: source; Owner: enterprisedb
--

CREATE TABLE source.table_for_identical (
    col1 integer NOT NULL,
    col2 text
);


ALTER TABLE source.table_for_identical OWNER TO enterprisedb;

--
-- TOC entry 12260 (class 1259 OID 148977)
-- Name: table_for_index; Type: TABLE; Schema: source; Owner: enterprisedb
--

CREATE TABLE source.table_for_index (
    col1 integer NOT NULL,
    col2 text
);


ALTER TABLE source.table_for_index OWNER TO enterprisedb;

--
-- TOC entry 12269 (class 1259 OID 149128)
-- Name: table_for_primary_key; Type: TABLE; Schema: source; Owner: enterprisedb
--

CREATE TABLE source.table_for_primary_key (
    col1 integer NOT NULL,
    col2 text NOT NULL
);


ALTER TABLE source.table_for_primary_key OWNER TO enterprisedb;

--
-- TOC entry 12264 (class 1259 OID 149024)
-- Name: table_for_rule; Type: TABLE; Schema: source; Owner: enterprisedb
--

CREATE TABLE source.table_for_rule (
    col1 bigint NOT NULL,
    col2 text
);


ALTER TABLE source.table_for_rule OWNER TO enterprisedb;

--
-- TOC entry 12266 (class 1259 OID 149048)
-- Name: table_for_trigger; Type: TABLE; Schema: source; Owner: enterprisedb
--

CREATE TABLE source.table_for_trigger (
    col1 bigint NOT NULL,
    col2 text
);


ALTER TABLE source.table_for_trigger OWNER TO enterprisedb;

--
-- TOC entry 56893 (class 2606 OID 148904)
-- Name: table_for_constraints Exclusion; Type: CONSTRAINT; Schema: source; Owner: enterprisedb
--

ALTER TABLE ONLY source.table_for_constraints
    ADD CONSTRAINT "Exclusion" EXCLUDE USING gist (col2 WITH <>) WITH (fillfactor='12') WHERE ((col1 > 1)) DEFERRABLE INITIALLY DEFERRED;


--
-- TOC entry 61067 (class 0 OID 0)
-- Dependencies: 56893
-- Name: CONSTRAINT "Exclusion" ON table_for_constraints; Type: COMMENT; Schema: source; Owner: enterprisedb
--

COMMENT ON CONSTRAINT "Exclusion" ON source.table_for_constraints IS 'comments';


--
-- TOC entry 56891 (class 2606 OID 148911)
-- Name: table_for_constraints check_con; Type: CHECK CONSTRAINT; Schema: source; Owner: enterprisedb
--

ALTER TABLE source.table_for_constraints
    ADD CONSTRAINT check_con CHECK ((col1 > 10)) NOT VALID;


--
-- TOC entry 61068 (class 0 OID 0)
-- Dependencies: 56891
-- Name: CONSTRAINT check_con ON table_for_constraints; Type: COMMENT; Schema: source; Owner: enterprisedb
--

COMMENT ON CONSTRAINT check_con ON source.table_for_constraints IS 'coment';


--
-- TOC entry 56899 (class 2606 OID 148970)
-- Name: table_for_column table_for_column_pkey; Type: CONSTRAINT; Schema: source; Owner: enterprisedb
--

ALTER TABLE ONLY source.table_for_column
    ADD CONSTRAINT table_for_column_pkey PRIMARY KEY (col1);


--
-- TOC entry 56895 (class 2606 OID 148902)
-- Name: table_for_constraints table_for_constraints_pkey; Type: CONSTRAINT; Schema: source; Owner: enterprisedb
--

ALTER TABLE ONLY source.table_for_constraints
    ADD CONSTRAINT table_for_constraints_pkey PRIMARY KEY (col1);


--
-- TOC entry 56904 (class 2606 OID 148984)
-- Name: table_for_index table_for_index_pkey; Type: CONSTRAINT; Schema: source; Owner: enterprisedb
--

ALTER TABLE ONLY source.table_for_index
    ADD CONSTRAINT table_for_index_pkey PRIMARY KEY (col1);


--
-- TOC entry 56913 (class 2606 OID 149135)
-- Name: table_for_primary_key table_for_primary_key_pkey; Type: CONSTRAINT; Schema: source; Owner: enterprisedb
--

ALTER TABLE ONLY source.table_for_primary_key
    ADD CONSTRAINT table_for_primary_key_pkey PRIMARY KEY (col1, col2);


--
-- TOC entry 56909 (class 2606 OID 149031)
-- Name: table_for_rule table_for_rule_pkey; Type: CONSTRAINT; Schema: source; Owner: enterprisedb
--

ALTER TABLE ONLY source.table_for_rule
    ADD CONSTRAINT table_for_rule_pkey PRIMARY KEY (col1);


--
-- TOC entry 56907 (class 2606 OID 149011)
-- Name: table_for_identical table_for_table_for_identical_pkey; Type: CONSTRAINT; Schema: source; Owner: enterprisedb
--

ALTER TABLE ONLY source.table_for_identical
    ADD CONSTRAINT table_for_table_for_identical_pkey PRIMARY KEY (col1);


--
-- TOC entry 56911 (class 2606 OID 149055)
-- Name: table_for_trigger table_for_trigger_pkey; Type: CONSTRAINT; Schema: source; Owner: enterprisedb
--

ALTER TABLE ONLY source.table_for_trigger
    ADD CONSTRAINT table_for_trigger_pkey PRIMARY KEY (col1);


--
-- TOC entry 56897 (class 2606 OID 148913)
-- Name: table_for_constraints unique; Type: CONSTRAINT; Schema: source; Owner: enterprisedb
--

ALTER TABLE ONLY source.table_for_constraints
    ADD CONSTRAINT "unique" UNIQUE (col1);


--
-- TOC entry 61069 (class 0 OID 0)
-- Dependencies: 56897
-- Name: CONSTRAINT "unique" ON table_for_constraints; Type: COMMENT; Schema: source; Owner: enterprisedb
--

COMMENT ON CONSTRAINT "unique" ON source.table_for_constraints IS 'cmnt';


--
-- TOC entry 56900 (class 1259 OID 149023)
-- Name: index1; Type: INDEX; Schema: source; Owner: enterprisedb
--

CREATE INDEX index1 ON source.table_for_index USING btree (col2 varchar_pattern_ops);


--
-- TOC entry 56905 (class 1259 OID 149012)
-- Name: index_identical; Type: INDEX; Schema: source; Owner: enterprisedb
--

CREATE INDEX index_identical ON source.table_for_identical USING btree (col2 text_pattern_ops);


--
-- TOC entry 56901 (class 1259 OID 149211)
-- Name: index_same; Type: INDEX; Schema: source; Owner: enterprisedb
--

CREATE INDEX index_same ON source.table_for_index USING btree (col2 text_pattern_ops);


--
-- TOC entry 56902 (class 1259 OID 149022)
-- Name: index_source; Type: INDEX; Schema: source; Owner: enterprisedb
--

CREATE INDEX index_source ON source.table_for_index USING btree (col2 text_pattern_ops);


--
-- TOC entry 61044 (class 2618 OID 149032)
-- Name: table_for_rule rule1; Type: RULE; Schema: source; Owner: enterprisedb
--

CREATE RULE rule1 AS
    ON UPDATE TO source.table_for_rule DO INSTEAD NOTHING;


--
-- TOC entry 61070 (class 0 OID 0)
-- Dependencies: 61044
-- Name: RULE rule1 ON table_for_rule; Type: COMMENT; Schema: source; Owner: enterprisedb
--

COMMENT ON RULE rule1 ON source.table_for_rule IS 'comments';


--
-- TOC entry 61045 (class 2618 OID 149033)
-- Name: table_for_rule rule2; Type: RULE; Schema: source; Owner: enterprisedb
--

CREATE RULE rule2 AS
    ON INSERT TO source.table_for_rule DO NOTHING;

-- Collation scripts
CREATE COLLATION source.coll_src
    FROM pg_catalog."POSIX";

ALTER COLLATION source.coll_src
    OWNER TO enterprisedb;

COMMENT ON COLLATION source.coll_src
    IS 'Test Comment';

CREATE COLLATION source.coll_diff
    (LC_COLLATE = 'POSIX', LC_CTYPE = 'POSIX');

ALTER COLLATION source.coll_diff
    OWNER TO enterprisedb;

COMMENT ON COLLATION source.coll_diff
    IS 'Test Comment';

-- FTS Configuration scripts
CREATE TEXT SEARCH CONFIGURATION source.fts_con_src (
    COPY=german
);

ALTER TEXT SEARCH CONFIGURATION source.fts_con_src OWNER TO enterprisedb;

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
