-- Package: public."pkg_emp_$%{}[]()&*^!@""'`\/#"

-- DROP PACKAGE public."pkg_emp_$%{}[]()&*^!@""'`\/#";

CREATE OR REPLACE PACKAGE public."pkg_emp_$%{}[]()&*^!@""'`\/#"
IS
FUNCTION func2(v2 integer) RETURN integer;
PROCEDURE proc2(v2 integer);
gl_v character varying(50);
END "pkg_emp_$%{}[]()&*^!@""'`\/#";


CREATE OR REPLACE PACKAGE BODY public."pkg_emp_$%{}[]()&*^!@""'`\/#"
IS
FUNCTION func2(v2 integer) RETURN integer IS BEGIN RETURN V2+10; END FUNC2;
PROCEDURE proc2(v2 integer) IS BEGIN DBMS_OUTPUT.put_line(v2+50); END;
END "pkg_emp_$%{}[]()&*^!@""'`\/#";

COMMENT ON PACKAGE public."pkg_emp_$%{}[]()&*^!@""'`\/#"
    IS 'test comment updated';
