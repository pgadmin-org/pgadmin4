--
-- enterprisedbQL database dump
--

-- Dumped from database version 10.7
-- Dumped by pg_dump version 12beta2

-- Started on 2019-11-01 12:54:15 IST

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;

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
-- Name: table_for_identical; Type: TABLE; Schema: source; Owner: enterprisedb;
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
-- Name: table_for_identical table_for_table_for_identical_pkey; Type: CONSTRAINT; Schema: source; Owner: enterprisedb;
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
-- Name: index_identical; Type: INDEX; Schema: source; Owner: enterprisedb;
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
    FROM pg_catalog."default";

ALTER COLLATION source.coll_src
    OWNER TO enterprisedb;

COMMENT ON COLLATION source.coll_src
    IS 'Test Comment';

CREATE COLLATION source.coll_diff
    FROM pg_catalog."default";

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

-- Domain and Domain Constraint script
CREATE DOMAIN source.dom_src
    AS bigint
    DEFAULT 100
    NOT NULL;

ALTER DOMAIN source.dom_src OWNER TO enterprisedb;

ALTER DOMAIN source.dom_src
    ADD CONSTRAINT con_src CHECK (VALUE <> 100);

CREATE DOMAIN source.dom_cons_diff
    AS bigint
    DEFAULT 100
    NOT NULL;

ALTER DOMAIN source.dom_cons_diff OWNER TO enterprisedb;

ALTER DOMAIN source.dom_cons_diff
    ADD CONSTRAINT cons_diff_1 CHECK (VALUE <> 50);

ALTER DOMAIN source.dom_cons_diff
    ADD CONSTRAINT cons_src_only CHECK (VALUE <> 25);

CREATE DOMAIN source.dom_type_diff
    AS character varying(40)
    COLLATE pg_catalog."POSIX";

ALTER DOMAIN source.dom_type_diff OWNER TO enterprisedb;

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
    OWNER TO enterprisedb;

CREATE TYPE source.typ_comp_diff AS
(
	m1 numeric(5,2),
	m3 character varying(30) COLLATE pg_catalog."C"
);
ALTER TYPE source.typ_comp_diff
    OWNER TO enterprisedb;
COMMENT ON TYPE source.typ_comp_diff
    IS 'Test Comment';
GRANT USAGE ON TYPE source.typ_comp_diff TO PUBLIC;
GRANT USAGE ON TYPE source.typ_comp_diff TO enterprisedb;

CREATE TYPE source.typ_comp_diff_no_column AS
(
);
ALTER TYPE source.typ_comp_diff_no_column
    OWNER TO enterprisedb;

-- Type Script ENUM type
CREATE TYPE source.typ_enum_src AS ENUM
    ('test_enum');
ALTER TYPE source.typ_enum_src
    OWNER TO enterprisedb;

CREATE TYPE source.typ_enum_diff AS ENUM
    ('test_enum', 'test_enum_1');
ALTER TYPE source.typ_enum_diff
    OWNER TO enterprisedb;
COMMENT ON TYPE source.typ_enum_diff
    IS 'Test Comment';

-- Type Script RANGE type
CREATE TYPE source.typ_range_src AS RANGE
(
    SUBTYPE=text,
    COLLATION = pg_catalog."POSIX",
    SUBTYPE_OPCLASS = text_ops
);
ALTER TYPE source.typ_range_src
    OWNER TO enterprisedb;

CREATE TYPE source.typ_range_col_diff AS RANGE
(
    SUBTYPE=text,
    COLLATION = pg_catalog."C",
    SUBTYPE_OPCLASS = text_ops
);
ALTER TYPE source.typ_range_col_diff
    OWNER TO enterprisedb;
COMMENT ON TYPE source.typ_range_col_diff
    IS 'Test Comment';
GRANT USAGE ON TYPE source.typ_range_col_diff TO PUBLIC;
GRANT USAGE ON TYPE source.typ_range_col_diff TO enterprisedb WITH GRANT OPTION;

CREATE TYPE source.typ_range_subtype_diff AS RANGE
(
    SUBTYPE=bpchar,
    COLLATION = pg_catalog."POSIX"
);
ALTER TYPE source.typ_range_subtype_diff
    OWNER TO enterprisedb;

-- Type Script SHELL type
CREATE TYPE source.typ_shell_src;
ALTER TYPE source.typ_shell_src
    OWNER TO enterprisedb;

CREATE TYPE source.typ_shell_diff;
ALTER TYPE source.typ_shell_diff
    OWNER TO enterprisedb;
COMMENT ON TYPE source.typ_shell_diff
    IS 'Test Comment';

-- Type script to test when Type is different
CREATE TYPE source.typ_comp_range_diff AS
(
	m1 bigint,
	m2 text[] COLLATE pg_catalog."POSIX"
);
ALTER TYPE source.typ_comp_range_diff
    OWNER TO enterprisedb;

CREATE TYPE source.typ_comp_enum_diff AS
(
	m1 bigint,
	m2 text[] COLLATE pg_catalog."POSIX"
);
ALTER TYPE source.typ_comp_range_diff
    OWNER TO enterprisedb;

CREATE TYPE source.typ_range_comp_diff AS RANGE
(
    SUBTYPE=text,
    COLLATION = pg_catalog."C",
    SUBTYPE_OPCLASS = text_ops
);
ALTER TYPE source.typ_range_comp_diff
    OWNER TO enterprisedb;

CREATE TYPE source.typ_range_enum_diff AS RANGE
(
    SUBTYPE=text,
    COLLATION = pg_catalog."C",
    SUBTYPE_OPCLASS = text_ops
);
ALTER TYPE source.typ_range_enum_diff
    OWNER TO enterprisedb;

CREATE TYPE source.typ_enum_comp_diff AS ENUM
    ('test_enum', 'test_enum_1');
ALTER TYPE source.typ_enum_comp_diff
    OWNER TO enterprisedb;

CREATE TYPE source.typ_enum_range_diff AS ENUM
    ('test_enum', 'test_enum_1');
ALTER TYPE source.typ_enum_range_diff
    OWNER TO enterprisedb;

-- Package script (source only)
CREATE OR REPLACE PACKAGE source.pkg_src
IS
    FUNCTION get_dept_name(p_deptno numeric) RETURN character varying;
    PROCEDURE hire_emp(p_empno numeric, p_ename character varying, p_job character varying, p_sal numeric, p_hiredate timestamp without time zone, p_comm numeric, p_mgr numeric, p_deptno numeric);
END pkg_src;

CREATE OR REPLACE PACKAGE BODY source.pkg_src
IS
    FUNCTION get_dept_name(p_deptno numeric) RETURN character varying IS
        v_dname         VARCHAR2(14);
    BEGIN
        SELECT dname INTO v_dname FROM dept WHERE deptno = p_deptno;
        RETURN v_dname;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            DBMS_OUTPUT.PUT_LINE('Invalid department number ' || p_deptno);
            RETURN '';
    END;

    PROCEDURE hire_emp(p_empno numeric, p_ename character varying, p_job character varying, p_sal numeric, p_hiredate timestamp without time zone, p_comm numeric, p_mgr numeric, p_deptno numeric) IS
    BEGIN
        INSERT INTO emp(empno, ename, job, sal, hiredate, comm, mgr, deptno)
            VALUES(p_empno, p_ename, p_job, p_sal,
                   p_hiredate, p_comm, p_mgr, p_deptno);
    END;
END pkg_src;

COMMENT ON PACKAGE source.pkg_src
    IS 'Target';

-- Package script difference in header, acl and comment
CREATE OR REPLACE PACKAGE source.pkg_header_diff
IS
    FUNCTION get_dept_name(p_deptno numeric) RETURN character varying;
    PROCEDURE hire_emp(p_empno numeric, p_ename character varying, p_job character varying, p_sal numeric, p_hiredate timestamp without time zone, p_comm numeric, p_mgr numeric, p_deptno numeric);
END pkg_header_diff;

CREATE OR REPLACE PACKAGE BODY source.pkg_header_diff
IS
    FUNCTION get_dept_name(p_deptno numeric) RETURN character varying IS
        v_dname         VARCHAR2(14);
    BEGIN
        SELECT dname INTO v_dname FROM dept WHERE deptno = p_deptno;
        RETURN v_dname;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            DBMS_OUTPUT.PUT_LINE('Invalid department number ' || p_deptno);
            RETURN '';
    END;

    PROCEDURE hire_emp(p_empno numeric, p_ename character varying, p_job character varying, p_sal numeric, p_hiredate timestamp without time zone, p_comm numeric, p_mgr numeric, p_deptno numeric) IS
    BEGIN
        INSERT INTO emp(empno, ename, job, sal, hiredate, comm, mgr, deptno)
            VALUES(p_empno, p_ename, p_job, p_sal,
                   p_hiredate, p_comm, p_mgr, p_deptno);
    END;
END pkg_header_diff;

COMMENT ON PACKAGE source.pkg_header_diff
    IS 'Header Diff';

GRANT EXECUTE ON PACKAGE source.pkg_header_diff TO PUBLIC;
GRANT EXECUTE ON PACKAGE source.pkg_header_diff TO enterprisedb WITH GRANT OPTION;

-- Package script difference in body, acl and comment
CREATE OR REPLACE PACKAGE source.pkg_body_diff
IS
    PROCEDURE hire_emp(p_empno numeric, p_ename character varying, p_job character varying, p_sal numeric, p_hiredate timestamp without time zone, p_comm numeric, p_mgr numeric, p_deptno numeric);
END pkg_body_diff;

CREATE OR REPLACE PACKAGE BODY source.pkg_body_diff
IS
    PROCEDURE hire_emp(p_empno numeric, p_ename character varying, p_job character varying, p_sal numeric, p_hiredate timestamp without time zone, p_comm numeric, p_mgr numeric, p_deptno numeric) IS
    BEGIN
        DBMS_OUTPUT.PUT_LINE('Before Insert ');
        INSERT INTO emp(empno, ename, job, sal, hiredate, comm, mgr, deptno)
            VALUES(p_empno, p_ename, p_job, p_sal,
                   p_hiredate, p_comm, p_mgr, p_deptno);
        DBMS_OUTPUT.PUT_LINE('After Insert ');
    END;
END pkg_body_diff;

-- Synonyms Scripts
-- Prerequisite for synonyms
CREATE OR REPLACE FUNCTION source.fun_for_syn()
RETURNS void
    LANGUAGE 'plpgsql'
    VOLATILE
    COST 100

AS $BODY$BEGIN
SELECT 1;
END;$BODY$;
ALTER FUNCTION source.fun_for_syn()
    OWNER TO enterprisedb;

CREATE OR REPLACE PROCEDURE source.proc_for_syn()
AS $BODY$BEGIN
SELECT 1;
END;$BODY$;

CREATE OR REPLACE PACKAGE source.pkg_for_syn
IS
FUNCTION get_dept_name(p_deptno numeric) RETURN character varying;
END pkg_for_syn;
CREATE OR REPLACE PACKAGE BODY source.pkg_for_syn
IS
FUNCTION get_dept_name(p_deptno numeric) RETURN character varying IS
BEGIN
    RETURN '';
END;
END pkg_for_syn;

CREATE TABLE source.table_for_syn
(
    id bigint,
    name text COLLATE pg_catalog."default"
)
TABLESPACE pg_default;
ALTER TABLE source.table_for_syn
    OWNER to enterprisedb;

CREATE SEQUENCE source.seq_for_syn
    INCREMENT 5
    START 1
    MINVALUE 1
    MAXVALUE 100
    CACHE 1;
ALTER SEQUENCE source.seq_for_syn
    OWNER TO enterprisedb;

CREATE OR REPLACE SYNONYM source.syn_fun_src
    FOR source.fun_for_syn;

CREATE OR REPLACE SYNONYM source.syn_pkg_src
    FOR source.pkg_for_syn;

CREATE OR REPLACE SYNONYM source.syn_proc_src
    FOR source.proc_for_syn;

CREATE OR REPLACE SYNONYM source.syn_seq_src
    FOR source.seq_for_syn;

CREATE OR REPLACE SYNONYM source.syn_table_src
    FOR source.table_for_syn;

CREATE TABLE public.table_for_syn
(
    id bigint,
    name text COLLATE pg_catalog."default"
)
TABLESPACE pg_default;
ALTER TABLE public.table_for_syn
    OWNER to enterprisedb;

CREATE OR REPLACE SYNONYM source.syn_diff
    FOR public.table_for_syn;

-- Sequences Script
CREATE SEQUENCE source.seq_src
    CYCLE
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 3
    CACHE 6;
ALTER SEQUENCE source.seq_src
    OWNER TO enterprisedb;
COMMENT ON SEQUENCE source.seq_src
    IS 'Test Comment';
GRANT ALL ON SEQUENCE source.seq_src TO PUBLIC;
GRANT ALL ON SEQUENCE source.seq_src TO enterprisedb;

CREATE SEQUENCE source.seq_diff_comment_acl
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;
ALTER SEQUENCE source.seq_diff_comment_acl
    OWNER TO enterprisedb;
COMMENT ON SEQUENCE source.seq_diff_comment_acl
    IS 'Test Comment';
GRANT ALL ON SEQUENCE source.seq_diff_comment_acl TO PUBLIC;
GRANT ALL ON SEQUENCE source.seq_diff_comment_acl TO enterprisedb;

CREATE SEQUENCE source.seq_diff_comment_acl_remove
    INCREMENT 1
    START 1
    MINVALUE 1
    MAXVALUE 9223372036854775807
    CACHE 1;
ALTER SEQUENCE source.seq_diff_comment_acl_remove
    OWNER TO enterprisedb;

CREATE SEQUENCE source.seq_diff
    CYCLE
    INCREMENT 3
    START 3
    MINVALUE 3
    MAXVALUE 100
    CACHE 2;
ALTER SEQUENCE source.seq_diff
    OWNER TO enterprisedb;

CREATE SEQUENCE source.seq_start_diff
    INCREMENT 5
    START 3
    MINVALUE 3
    MAXVALUE 20;
ALTER SEQUENCE source.seq_start_diff
    OWNER TO enterprisedb;

-- Foreign Data Wrapper to test foreign table
CREATE FOREIGN DATA WRAPPER test_fdw_for_foreign_table;
ALTER FOREIGN DATA WRAPPER test_fdw_for_foreign_table
    OWNER TO enterprisedb;

-- Foreign Server to test foreign table
CREATE SERVER test_fs_for_foreign_table
    FOREIGN DATA WRAPPER test_fdw_for_foreign_table;
ALTER SERVER test_fs_for_foreign_table
    OWNER TO enterprisedb;
CREATE SERVER test_fs2_for_foreign_table
    FOREIGN DATA WRAPPER test_fdw_for_foreign_table;
ALTER SERVER test_fs2_for_foreign_table
    OWNER TO enterprisedb;

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
    OWNER to enterprisedb;

CREATE FOREIGN TABLE source.ft_src(
    fid bigint NULL,
    fname text NULL COLLATE pg_catalog."default"
)
    SERVER test_fs_for_foreign_table;
ALTER FOREIGN TABLE source.ft_src
    OWNER TO enterprisedb;
ALTER FOREIGN TABLE source.ft_src
    ADD CONSTRAINT fcheck CHECK ((fid > 1000)) NO INHERIT;
COMMENT ON FOREIGN TABLE source.ft_src
    IS 'Test Comment';
GRANT INSERT ON TABLE source.ft_src TO PUBLIC;
GRANT ALL ON TABLE source.ft_src TO enterprisedb;

CREATE FOREIGN TABLE source.ft_diff_col(
    fid bigint NULL,
    fname text NULL COLLATE pg_catalog."default",
    fcity character varying(40) NULL COLLATE pg_catalog."POSIX"
)
    SERVER test_fs_for_foreign_table;
ALTER FOREIGN TABLE source.ft_diff_col
    OWNER TO enterprisedb;
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
    OWNER TO enterprisedb;

ALTER FOREIGN TABLE source.ft_diff_const
    ADD CONSTRAINT fcheck CHECK ((fid > 1000)) NO INHERIT;
ALTER FOREIGN TABLE source.ft_diff_const
    ADD CONSTRAINT fcheck1 CHECK ((fid > 1000)) NO INHERIT NOT VALID;
ALTER FOREIGN TABLE source.ft_diff_const
    ADD CONSTRAINT fcheck2 CHECK ((fid > 20));
ALTER FOREIGN TABLE source.ft_diff_const
    ADD CONSTRAINT fcheck_src CHECK ((fid > 50));

GRANT INSERT ON TABLE source.ft_diff_const TO PUBLIC;
GRANT ALL ON TABLE source.ft_diff_const TO enterprisedb;

CREATE FOREIGN TABLE source.ft_diff_opt(
    fid bigint NULL,
    fname text NULL COLLATE pg_catalog."default"
)
    SERVER test_fs_for_foreign_table
    OPTIONS (opt1 'val1', opt2 'val20', opt_src 'val_src');
ALTER FOREIGN TABLE source.ft_diff_opt
    OWNER TO enterprisedb;

CREATE FOREIGN TABLE source.ft_diff_foreign_server(
    fid bigint NULL,
    fname text NULL COLLATE pg_catalog."default"
)
    SERVER test_fs_for_foreign_table;
ALTER FOREIGN TABLE source.ft_diff_foreign_server
    OWNER TO enterprisedb;

CREATE FOREIGN TABLE source.ft_diff_foreign_server_1(
    fid bigint NULL,
    fname text NULL COLLATE pg_catalog."default"
)
    SERVER test_fs_for_foreign_table
    OPTIONS (opt1 'val1');
ALTER FOREIGN TABLE source.ft_diff_foreign_server_1
    OWNER TO enterprisedb;
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
