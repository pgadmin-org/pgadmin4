# pgAdmin Windows Builds

These notes describe how to setup a Windows development/build environment for
pgAdmin. Only 64 bit builds are supported from v4.30 onwards, however 32 bit
builds may still work with suitable adjustments.

## Installing build requirements

1. Install Chocolatey from https://chocolatey.org/install#individual


2. Install Visual Studio 2017 Pro (PostgreSQL 16 and below) from
    https://my.visualstudio.com/Downloads?q=Visual%20Studio%202017.
    Choose the Desktop development with C++ option, and ensure that you add the
    'Visual C++ MFC for x86 and x64' option.


3. Install Visual Studio (PostgreSQL 17 and above):

        choco install visualstudio2022community --add Microsoft.VisualStudio.Component.VC.ATLMFC;includeRecommended --add Microsoft.VisualStudio.Workload.NativeDesktop;includeRecommended --add Microsoft.VisualStudio.Component.VC.CMake.Project;includeRecommended

4. Install various command line tools:

        choco install -y awk bzip2 cmake diffutils dotnet3.5 gnuwin32-coreutils.install gzip git html-help-workshop meson innosetup ninja nodejs-lts python sed strawberryperl wget winflexbison3 yarn

5. Ensure the GNU CoreUtils and Microsoft HTML Help Workshop are in the system path - add:

    * C:\Program Files (x86)\GnuWin32\bin
    * C:\Program Files (x86)\HTML Help Workshop


6. Upgrade pip:

        python -m pip install --upgrade pip

7. Install virtualenv:

        pip install virtualenv

## Building dependencies (PostgreSQL 16 and below)

The following steps should be run from a Visual Studio 64bit command
prompt.

1. Create a directory for the dependencies:

        mkdir c:\build64

2. Download the zlib source code, unpack, and build it:

        wget https://zlib.net/zlib-1.3.11.tar.gz
        tar -zxvf zlib-1.3.1.tar.gz
        cd zlib-1.3.1
        nmake -f win32/Makefile.msc
        mkdir c:\build64\zlib
        mkdir c:\build64\zlib\bin
        copy zlib1.dll c:\build64\zlib\bin\
        copy zlib1.pdb c:\build64\zlib\bin\
        mkdir c:\build64\zlib\include
        copy zlib.h c:\build64\zlib\include\
        copy zconf.h c:\build64\zlib\include\
        mkdir c:\build64\zlib\lib
        copy zlib.lib c:\build64\zlib\lib\
        copy zlib.pdb c:\build64\zlib\lib\
        copy zdll.lib c:\build64\zlib\lib\
        copy zdll.exp c:\build64\zlib\lib\
        cd ..

3. Download the OpenSSL source code, unpack and build it:

        wget https://www.openssl.org/source/openssl-3.0.13.tar.gz
        tar -zxvf openssl-3.0.13.tar.gz
        cd openssl-3.0.13
        perl Configure VC-WIN64A no-asm --prefix=C:\build64\openssl no-ssl3 no-comp
        nmake
        nmake test
        nmake install
        cd ..

    Note that if you are not working in an administrative account, you may need to
    create and give your regular account appropriate permissions to write/modify
    files in *C:\Program Files\Common Files\SSL*. This is the default directory used
    for the *OPENSSLDIR*, and should not be changed to a directory that un-privileged
    users could potentially write to.


4. Download the MIT Kerberos source code, unpack and build it:

   In a *32bit* Visual Studio command prompt:

        wget https://kerberos.org/dist/krb5/1.21/krb5-1.21.2.tar.gz
        tar -zxvf krb5-1.21.2.tar.gz
        mkdir C:\build64\krb5
        cd krb5-1.21.2\src
        set KRB_INSTALL_DIR=C:\build64\krb5
        nmake -f Makefile.in prep-windows

   Optionally, if you want 32bit binaries as well as 64bit:

        nmake NODEBUG=1
        nmake install NODEBUG=1

   In a *64bit* Visual Studio command prompt:

        cd krb5-1.21.2\src
        set PATH=%PATH%;"%WindowsSdkVerBinPath%"\x86
        set KRB_INSTALL_DIR=C:\build64\krb5
        nmake NODEBUG=1
        nmake install NODEBUG=1
        cd ..\..

5. Download the PostgreSQL source code, unpack and build it:

        wget https://ftp.postgresql.org/pub/source/v13.3/postgresql-16.3.tar.gz
        tar -zxvf postgresql-16.3.tar.gz
        cd postgresql-16.3\src\tools\msvc
        
        >> config.pl echo # Configuration arguments for vcbuild.
        >> config.pl echo use strict;
        >> config.pl echo use warnings;
        >> config.pl echo.
        >> config.pl echo our $config = {
        >> config.pl echo 	asserts   =^> 0,        # --enable-cassert
        >> config.pl echo 	ldap      =^> 1,        # --with-ldap
        >> config.pl echo 	extraver  =^> undef,    # --with-extra-version=^<string^>
        >> config.pl echo 	gss       =^> undef,    # --with-gssapi=^<path^>
        >> config.pl echo 	icu       =^> undef,    # --with-icu=^<path^>
        >> config.pl echo 	nls       =^> undef,    # --enable-nls=^<path^>
        >> config.pl echo 	tap_tests =^> undef,    # --enable-tap-tests
        >> config.pl echo 	tcl       =^> undef,    # --with-tcl=^<path^>
        >> config.pl echo 	perl      =^> undef,    # --with-perl
        >> config.pl echo 	python    =^> undef,    # --with-python=^<path^>
        >> config.pl echo 	openssl   =^> 'C:\build64\openssl',    # --with-openssl=^<path^>
        >> config.pl echo 	uuid      =^> undef,    # --with-ossp-uuid
        >> config.pl echo 	xml       =^> undef,    # --with-libxml=^<path^>
        >> config.pl echo 	xslt      =^> undef,    # --with-libxslt=^<path^>
        >> config.pl echo 	iconv     =^> undef,    # (not in configure, path to iconv)
        >> config.pl echo 	zlib      =^> 'C:\build64\zlib'     # --with-zlib=^<path^>
        >> config.pl echo };
        >> config.pl echo.
        >> config.pl echo 1;
        
        >> buildenv.pl echo $ENV{PATH} = "C:\\build64\\openssl\\bin;C:\\build64\\zlib\\bin;$ENV{PATH}";
        
        perl build.pl Release
        perl vcregress.pl check
        perl install.pl c:\build64\pgsql
        copy c:\build64\zlib\bin\zlib1.dll c:\build64\pgsql\bin\
        copy c:\build64\openssl\bin\libssl-3-x64.dll c:\build64\pgsql\bin\
        copy c:\build64\openssl\bin\libcrypto-3-x64.dll c:\build64\pgsql\bin\

## Building dependencies (PostgreSQL 17 and above)

PostgreSQL 17 and later use Meson for generating project/build files, and 
makes use of pkg-config to locate dependencies and configure the build 
accordingly. Whilst this is arguably more reliably and flexible, it also
takes some effort to setup. 

It is therefore recommended that you simply download a pre-built set of 
PostgreSQL binaries from the 
[winpgbuild project](https://github.com/dpage/winpgbuild/actions/workflows/postgresql.yml).
Locate the binaries asset for the version of PostgreSQL you wish to use
in the most recent workflow run, and extract the contents to a suitable
directory such as `C:\Build64`.

Repeat the process with the latest build of 
[MIT Kerberos](https://github.com/dpage/winpgbuild/actions/workflows/krb5.yml),
merging the files into the same set of directories. This is required because
the PostgreSQL build doesn't include Kerberos (gssapi) support as it uses 
native SSPI instead.

## Setting up a dev environment

This section describes the steps to setup and run pgAdmin for the first time in
a development environment. You do not need to complete this section if you just
want to build an installer.

1. Check out the source code:

        git clone https://github.com/pgadmin-org/pgadmin4.git

2. Install and build the JS dependencies:

        cd pgadmin4\web
        yarn install
        yarn run bundle

3. Create a virtual env:

        cd pgadmin4
        python -m venv venv
        pip install -r web\regression\requirements.txt
        pip install sphinx
        pip install sphinxcontrib-youtube

You should now be able to run the pgAdmin Python application, or build the
desktop runtime.

## Building an installer

1. Set the required environment variables, either system-wide, or in a Visual
Studio 2017 (or 2022 with PostgreSQL 17+) 64bit command prompt. Note that the 
examples shown below are the defaults for the build system, so if they match
your requirements you don't need to set them. For PostgreSQL 16 and below:

        SET "PGADMIN_POSTGRES_DIR=C:\build64\pgsql"
        SET "PGADMIN_PYTHON_DIR=C:\Python313"
        SET "PGADMIN_KRB5_DIR=C:\build64\krb5"
        SET "PGADMIN_INNOTOOL_DIR=C:\Program Files (x86)\Inno Setup 6"
        SET "PGADMIN_SIGNTOOL_DIR=C:\Program Files (x86)\Windows Kits\10\bin\10.0.17763.0\x64"
        SET "PGADMIN_VCREDIST_DIR=C:\Program Files (x86)\Microsoft Visual Studio\2017\Professional\VC\Redist\MSVC\14.16.27012"
        SET "PGADMIN_VCREDIST_FILE=vcredist_x64.exe"

    For PostgreSQL 17 and later:

        SET "PGADMIN_POSTGRES_DIR=C:\build64"
        SET "PGADMIN_PYTHON_DIR=C:\Python313"
        SET "PGADMIN_KRB5_DIR=C:\build64"
        SET "PGADMIN_INNOTOOL_DIR=C:\Program Files (x86)\Inno Setup 6"
        SET "PGADMIN_SIGNTOOL_DIR=C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64"
        SET "PGADMIN_VCREDIST_DIR=C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Redist\MSVC\14.40.33807"
        SET "PGADMIN_VCREDIST_FILE=vc_redist.x64.exe"

2. Run:

        make

    If you have a code signing certificate, this will automatically be used if
    found in the Windows Certificate Store to sign the installer.


3. Find the completed installer in the dist/ subdirectory of your source tree.
