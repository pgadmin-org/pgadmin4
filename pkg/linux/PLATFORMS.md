# Adding and retiring Linux platforms

Debian, Ubuntu, Fedora and EL releases come and go several times a year, and
each one is named in more places than is obvious: the build matrices, the
staging and release workflows, the acceptance tests and the publishing wrapper
on the servers all carry their own list. Missing one does not always fail
loudly (a platform the wrapper does not know about is built, uploaded and then
quietly left unindexed), so work through the whole of the relevant section
below rather than stopping when CI goes green.

Architectures are a different change, and are not covered here; see the
comments on the RPM tree in `.github/workflows/snapshot.yml`, `YUM_TARGETS` in
`pkg/publish/pga-publish` and `Architectures` in `pkg/publish/aptftp.conf`.

## Where platforms are named

| File | What it holds | Naming |
|---|---|---|
| `.github/workflows/check-deb-build.yml` | The DEB build matrix, which the snapshot and release candidate workflows call | `debian-13`, `ubuntu-2604`, plus the container image |
| `.github/workflows/check-rpm-build.yml` | The RPM build matrix, likewise | `el-10`, `fedora-44`, plus the image and the PGDG repository RPM URL |
| `.github/workflows/snapshot.yml` | `codename_for()`, mapping DEB build names to codenames; the `case` mapping RPM build names to repository trees | `ubuntu-2604` to `resolute`; `el-10` to `redhat/rhel-10` |
| `.github/workflows/release-candidate.yml` | The same two mappings, duplicated | as above |
| `.github/workflows/acceptance-test.yml` | The install test matrices, which add the published repositories and install from them | `resolute`; `rhel-10`, `fedora-44` |
| `.github/workflows/promote-release.yml` | The `rebuild-apt` and `rebuild-yum` calls in "Publish the packages" | `resolute`; `redhat rhel 10 x86_64` |
| `pkg/publish/pga-publish` | `APT_CODENAMES` and `YUM_TARGETS`, which decide what the servers create, index and promote | as `promote-release.yml` |

These do not need changing for a new release of an existing distribution:

* The repository configuration RPMs (`pkg/redhat/repo-rpm.sh`), which use
  `$releasever` rather than naming versions.
* The repository READMEs, whose platform tables `install-repo-readme.py`
  derives from the trees on disk and the archive bucket.
* The DEB and RPM build scripts, unless the new release needs something
  different; see 'Version-specific code' below.

## Adding a platform

### Before starting

Check that the pieces the build depends on exist for the new release:

* The container image on Docker Hub (`ubuntu:26.04`, `fedora:45`,
  `almalinux:11`). New Ubuntu releases usually have a tag some weeks before
  release; building against a pre-release image is fine for proving the build,
  but do not publish packages from one.
* For RPM platforms, the PGDG repository RPM
  (`https://download.postgresql.org/pub/repos/yum/reporpms/`), since the build
  takes `libpq5-devel` and `postgresql18-devel` from PGDG. On EL, EPEL must
  also exist for the new version. DEB builds use the distribution's own
  `libpq-dev` and have no equivalent dependency.
* The codename, for DEB platforms: it is what `lsb_release -cs` prints and
  what the repository directory is called, so take it from the release itself
  rather than from the version number.

### In this repository

All of this goes in one pull request. The DEB and RPM checks do not run on
pull requests, only on pushes to `master` and on dispatch, so prove the new
matrix leg before merging by dispatching `check-deb-build.yml` or
`check-rpm-build.yml` against the branch in a fork with Actions enabled
(`gh workflow run check-deb-build.yml --ref <branch>`).

1. Add the matrix leg to `check-deb-build.yml` or `check-rpm-build.yml`,
   copying the neighbouring entry's form exactly. The `name` becomes part of
   the artifact name, and the mappings below parse it back out.
2. Add the mapping for the new name to `snapshot.yml` and to
   `release-candidate.yml`. A DEB name with no `codename_for()` entry fails
   the assemble job with `Unknown Debian build name`; an RPM name that is not
   `el-*` or `fedora-*` fails with `Unknown RPM build name`.
3. Add the platform to both matrices in `acceptance-test.yml`.
4. Add the `rebuild-apt` codename, or the `rebuild-yum` line, to "Publish the
   packages" in `promote-release.yml`.
5. Add the codename to `APT_CODENAMES`, or the tuple to `YUM_TARGETS`, in
   `pkg/publish/pga-publish`. The wrapper refuses to index anything not in
   these tables, and the snapshot and staging indexers only look for the trees
   they name, so without this the new packages are uploaded but never indexed,
   and `packages-fetch` never carries them into the live repository.

If the build needs a platform-specific change (a package renamed, a new
AppArmor rule, a different Python), make it in the same pull request, so that
the new matrix leg proves it.

### On the servers

`pga-publish` and the scripts beside it are installed by hand on both the
staging and the download servers, as described under "Installing" in
`pkg/publish/README.md`. Reinstall them on both once the pull request is
merged, and before the next snapshot, since the snapshot and release candidate
workflows build the new platform from then on and the servers will skip what
their installed copy of the tables does not name.

### Proving it

1. Dispatch a publishing snapshot (`gh workflow run snapshot.yml -f
   publish=true`), and check that the new platform's tree in the snapshot has
   signed indices (`InRelease` for APT, `repodata/repomd.xml.asc` for YUM), and that
   the snapshot's README lists it.
2. Install from the snapshot on the new platform, following that README.
3. The first release candidate's acceptance test installs it from the staging
   repository, which is the check that matters before promotion.

### The first release that carries it

`rebuild-readme` builds the production README's history from the archive
bucket, and exits with `<platform> is published but absent from the archive`
when a platform in the live tree has never been copied there. Promotion runs
`rebuild-readme` in "Publish the packages", before `sync-s3` copies the
release to the archive in "Update the website", so the first promotion after
adding a platform fails at that point, with the packages already live but the
website not updated. Until that ordering is changed, expect it: run
`pga-publish sync-s3` by hand on the download server, then rerun
`pga-publish rebuild-readme` for the affected kind and finish the website
steps.

### Elsewhere

The download pages on www.pgadmin.org list the supported platforms, and live
outside this repository. Open an issue for the platform, too, so that the
pre-release pass picks it up for the release notes, as with `Issue #9263`
("Added Ubuntu 25.10 and Fedora 43") in `release_notes_9_11.rst`.

## Retiring a platform

A platform is retired when it stops receiving builds. Its repository keeps
serving the last packages it had until somebody removes the tree, and the
archive bucket keeps them after that, since `sync-s3` never deletes.

### In this repository

Reverse steps 1 to 5 of adding a platform, in a single pull request: the
matrix leg, both mappings, both acceptance test entries, the promotion
`rebuild-*` line and the wrapper table entry. Then remove any version-specific
code that only existed for that platform (see below).

Keep the steps together. A platform removed from the wrapper tables but still
in the build matrices is built and uploaded, then silently left out of the
indices and the promotion.

Reinstall the wrapper on both servers once it is merged, as when adding one.

### On the download server

Nothing is removed automatically, and the production README will go on
listing the platform as supported for as long as its tree holds packages,
since it takes the supported list from the trees that exist. To move it to the
"no longer supported" table:

1. Make sure the archive bucket has the platform's last release, which it will
   if `sync-s3` has run since that release was promoted.
2. Remove the tree from the live repository: `apt/<codename>` for APT, or
   `yum/<family>/<name>-<version>-<arch>` and its `Server`, `Workstation` and
   `Client` compatibility links for YUM.
3. Run `pga-publish rebuild-readme apt` or `yum`.

When to do this is a policy decision rather than a mechanical one: users who
have not upgraded their distribution lose `apt update`/`dnf update` access to
pgAdmin the moment the tree goes.

## Version-specific code

The build scripts branch on the distribution version in a few places. Check
them when adding a platform, and delete the dead branches when retiring one:

* `pkg/debian/build.sh`: the AppArmor profile and `postinst` for Ubuntu 24 and
  later.
* `pkg/linux/build-functions.sh`: the EL 8 Python selection, in `_setup_env`
  and `_copy_code`.
* `pkg/redhat/setup.sh` and `pkg/debian/setup.sh`: prerequisites for building
  by hand. CI does not run these (the workflows install their own), so they
  are the likeliest to be out of date; `pkg/redhat/setup.sh`, for example,
  only knows EL 8 and 9.
* The comments in `check-deb-build.yml` and `check-rpm-build.yml`, which name
  the releases their workarounds apply to (PEP 668, dnf5, the distribution's
  Node.js on Ubuntu 26.04).
