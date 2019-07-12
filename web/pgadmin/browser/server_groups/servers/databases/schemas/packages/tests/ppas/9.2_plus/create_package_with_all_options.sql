-- Package: public."pkg_emp_$%{}[]()&*^!@""'`\/#"

-- DROP PACKAGE public."pkg_emp_$%{}[]()&*^!@""'`\/#";

CREATE OR REPLACE PACKAGE public."pkg_emp_$%{}[]()&*^!@""'`\/#"
IS
FUNCTION func1(v1 integer) RETURN integer;
PROCEDURE proc1(v1 integer);
gl_v character varying(50);
END "pkg_emp_$%{}[]()&*^!@""'`\/#";


CREATE OR REPLACE PACKAGE BODY public."pkg_emp_$%{}[]()&*^!@""'`\/#"
IS
FUNCTION func1(v1 integer) RETURN integer IS BEGIN RETURN V1+10; END;
PROCEDURE proc1(v1 integer) IS BEGIN DBMS_OUTPUT.put_line(v1+50); END;
END "pkg_emp_$%{}[]()&*^!@""'`\/#";

COMMENT ON PACKAGE public."pkg_emp_$%{}[]()&*^!@""'`\/#"
    IS 'test comment';
