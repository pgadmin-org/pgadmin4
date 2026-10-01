# pgAdmin macOS Builds

## Required Packages

Either build the sources or get them from macports or similar:

1. Yarn & NodeJS

2. PostgreSQL 12 or above from http://www.postgresql.org/, or the pre-built
   dependencies from the
   [pgbuild project](https://github.com/pgadmin-org/pgbuild), which is what the
   release builds use. Five are needed, openssl, krb5, zstd, lz4 and
   postgresql-18, each published as a release of its own:

       https://github.com/pgadmin-org/pgbuild/releases/download/<tag>/<tag>.tar.gz

   where <tag> is the release tag named in *pkg/pgbuild-deps.lock*, on the
   *<pkg>-macos-<arch>* line, and <arch> is arm64 or x86_64. Use those rather
   than the rolling *-latest* tags, so that what you build locally is what CI
   builds and what we ship. They unpack into subdirectories of a common prefix,
   /opt/pgbuild in CI, which is then given to the build as
   *PGADMIN_POSTGRES_DIR=/opt/pgbuild/postgresql*.

   These matter beyond convenience: they are built against each other with
   *--with-zstd* and *--with-lz4* and a consistent deployment target, which
   Homebrew's PostgreSQL is not. The build checks in *.github/workflows* fetch
   exactly these through the *install-pgbuild-deps* action, so a local build
   and a CI build work from the same binaries.

3. Python 3.9+ (required for running the build; the version that gets bundled
   is a separate thing, see below). The build environment should run this
   version of python in response to the *python* command.

4. syft, to generate the software bill of materials, and wget, which fetches
   Electron:

       brew install syft wget


## Pinned dependencies

*pkg/pgbuild-deps.lock* records, for every dependency the
*install-pgbuild-deps* action can fetch on either platform, the pgbuild
release tag to download and the SHA-256 the archive must hash to. The action
checks each download against it and refuses to unpack anything that does not
match, which matters because a macOS appbundle is Developer ID signed and
notarised and a Windows installer Authenticode signed, so without the lock
write access to pgbuild would be write access to what pgAdmin ships, and two
builds of the same commit would not contain the same binaries.

When pgbuild publishes a new build of something, the action says so as a
warning and carries on with the pinned version, since a dependency that
appeared overnight is not a reason to fail a build. To take the new one, run
the refresh tool, naming the package so that nothing else is disturbed, then
read the diff and commit it:

    tools/refresh_pgbuild_lock.py openssl

That diff, one line per dependency with the version visible in the tag, is
the record of a change to what we sign, and is the reason to bump
dependencies through the tool rather than by editing the lock by hand.

A checksum mismatch fails the build, and the message names the archive, the
expected digest and the one that arrived. Most such tags are per-version and
so never change, the exception being PostgreSQL, whose tag carries only the
major and is therefore rebuilt in place on every minor release. Satisfy
yourself that a rebuild is what happened before re-running, since this is also
what would catch a tampered dependency on its way into a signed build. An
archive with no entry in the lock fails the same way, rather than being
unpacked unverified.

pgbuild publishes a *.sha256* beside each archive. That is a convenience for
people, not a source of trust, since whoever rebuilds an archive rebuilds its
checksum too, so the action verifies against the lock instead.


## Building

1. The version of Python that gets bundled is read from
   *pkg/python-version.txt*, which the Windows packaging reads as well so that
   one commit cannot ship different interpreters on the two platforms that
   bundle one. To bundle a different version, edit that file.

2. If a path different from the default of /usr/local/pgsql for the PostgreSQL
   installation has been used, set the *PGADMIN_POSTGRES_DIR* environment variable
   appropriately, e.g:

       export PGADMIN_POSTGRES_DIR=/opt/local/pgsql

3. If you want to codesign the appbundle, copy *codesign.conf.in* to
   *codesign.conf* and set the values accordingly.

3. If you want to notarize the appbundle, copy *notarization.conf.in* to
   *notarization.conf* and set the values accordingly. Note that notarization
   will fail if the code isn't signed.
   
4. To build only DMG file, go to pgAdmin4 source root directory and execute:

       make appbundle

   To build both DMG and ZIP files, go to pgAdmin4 source root directory and execute:

       make appbundle BUILD_OPTS="--zip"
       
   This will create the python virtual environment and install all the required
   python modules mentioned in the requirements file using pip, build the
   runtime code and finally create the app bundle and the DMG and/or ZIP in *./dist*
   directory.
