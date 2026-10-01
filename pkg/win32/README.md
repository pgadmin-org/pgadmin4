# pgAdmin Windows Builds

These notes describe how to setup a Windows development/build environment for
pgAdmin. Only 64 bit builds are supported from v4.30 onwards, however 32 bit
builds may still work with suitable adjustments.

## Installing build requirements

1. Install Chocolatey from https://chocolatey.org/install#individual


2. Install Visual Studio:

        choco install visualstudio2022community --add Microsoft.VisualStudio.Component.VC.ATLMFC;includeRecommended --add Microsoft.VisualStudio.Workload.NativeDesktop;includeRecommended --add Microsoft.VisualStudio.Component.VC.CMake.Project;includeRecommended

3. Install the command line tools the build uses:

        choco install -y git innosetup nodejs-lts python syft wget yarn

    That is the whole list for building pgAdmin. The build calls yarn, node,
    npm, wget for the Electron download, syft for the SBOM, ISCC from Inno
    Setup, and signtool if you are signing; git is used indirectly, the bundle
    step recording the commit hash. curl and tar are used too, but Windows has
    shipped both since 1803, so they need no installing.

    Python is here for a development environment only. Building an installer
    does not need one, because Make.bat downloads the version named in
    *pkg/python-version.txt* into the build tree.

    If you intend to build the dependencies from source, rather than taking
    them from pgbuild as described below, you will also want the toolchain
    that needs, and the GnuWin32 binaries and HTML Help Workshop on the
    system path:

        choco install -y awk bzip2 cmake diffutils dotnet3.5 gnuwin32-coreutils.install gzip html-help-workshop meson ninja sed strawberryperl winflexbison3

    * C:\Program Files (x86)\GnuWin32\bin
    * C:\Program Files (x86)\HTML Help Workshop


4. Upgrade pip:

        python -m pip install --upgrade pip

5. Install virtualenv:

        pip install virtualenv

## Getting the dependencies

Download a pre-built set of dependencies from the
[pgbuild project](https://github.com/pgadmin-org/pgbuild), which is what the
release builds use. Building them from source is possible but not documented
here: PostgreSQL 17 and later use Meson and pkg-config, which takes a fair
amount of setting up, and doing it by hand gets you binaries built against
different libraries from the ones we ship. Two are needed on Windows,
postgresql-18 and krb5, and each is published as a release of its own:

    https://github.com/pgadmin-org/pgbuild/releases/download/<tag>/<tag>.zip

where `<tag>` is the release tag named in *pkg/pgbuild-deps.lock*, on the
*postgresql-18-windows-x86_64* and *krb5-windows-x86_64* lines. Use those
rather than the rolling *-latest* tags, so that what you build locally is what
CI builds and what we ship.

Extract both into the same directory, such as `C:\Build64`; they unpack into
*postgresql* and *krb5* subdirectories. PostgreSQL 18 and later are built with
GSSAPI support, so `libpq.dll` and the client binaries have a load-time
dependency on `gssapi64.dll`, and the installer stages the Kerberos runtime
next to them. Take care to refresh both together: a PostgreSQL build paired
with a stale MIT Kerberos build is exactly the sort of skew that is hard to
spot until someone tries to connect.

The build checks in *.github/workflows* fetch exactly these, through the
*install-pgbuild-deps* action, so a local build and a CI build are working
from the same binaries.

### Pinned dependencies

*pkg/pgbuild-deps.lock* records, for every dependency the *install-pgbuild-deps*
action can fetch on either platform, the pgbuild release tag to download and the
SHA-256 the archive must hash to. The action checks each download against it and
refuses to unpack anything that does not match, which matters because a Windows
installer is Authenticode signed and a macOS appbundle notarised, so without the
lock write access to pgbuild would be write access to what pgAdmin ships, and
two builds of the same commit would not contain the same binaries.

When pgbuild publishes a new build of something, the action says so as a
warning and carries on with the pinned version, since a dependency that
appeared overnight is not a reason to fail a build. To take the new one, run
the refresh tool, naming the package so that nothing else is disturbed, then
read the diff and commit it:

    python tools\refresh_pgbuild_lock.py openssl

That diff, one line per dependency with the version visible in the tag, is the
record of a change to what we sign, and is the reason to bump dependencies
through the tool rather than by editing the lock by hand.

A checksum mismatch fails the build, and the message names the archive, the
expected digest and the one that arrived. Most such tags are per-version and so
never change, the exception being PostgreSQL, whose tag carries only the major
and is therefore rebuilt in place on every minor release. Satisfy yourself that
a rebuild is what happened before re-running, since this is also what would
catch a tampered dependency on its way into a signed build. An archive with no
entry in the lock fails the same way, rather than being unpacked unverified.

pgbuild publishes a *.sha256* beside each archive. That is a convenience for
people, not a source of trust, since whoever rebuilds an archive rebuilds its
checksum too, so the action verifies against the lock instead.

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
Studio 2022 64bit command prompt. The values below are examples rather than
defaults, so check them against where you unpacked the dependencies:

        SET "PGADMIN_POSTGRES_DIR=C:\build64\postgresql"
        SET "PGADMIN_KRB5_DIR=C:\build64\krb5"
        SET "PGADMIN_INNOTOOL_DIR=C:\Program Files (x86)\Inno Setup 6"
        SET "PGADMIN_SIGNTOOL_DIR=C:\Program Files (x86)\Windows Kits\10\bin\10.0.22621.0\x64"
        SET "PGADMIN_VCREDIST_DIR=C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Redist\MSVC\14.40.33807"
        SET "PGADMIN_VCREDIST_FILE=vc_redist.x64.exe"

    Note that Python is not among them. Make.bat downloads the exact version
    named in *pkg/python-version.txt* into the build tree, both to build the
    virtual environment with and to ship, so no Python needs to be installed
    for the installer build and the one on the PATH is not consulted.

2. Run:

        make

    If you have a code signing certificate, this will automatically be used if
    found in the Windows Certificate Store to sign the installer. Signing is
    enabled by setting PGADMIN_WINDOWS_CSC to the certificate's subject name;
    without it the build produces an unsigned installer.

    See SIGNING.md for how the release signing host is set up, including the
    Certum hardware token, the certificate-to-key repair that its "simple"
    registration does not do correctly, and why the build agent must run in an
    interactive session rather than as a Windows service.


3. Find the completed installer in the dist/ subdirectory of your source tree.
