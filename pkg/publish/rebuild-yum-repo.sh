#!/bin/sh
#
# Index and sign one YUM repository tree, and create the EL compatibility
# symlinks that go with it.
#
# As with the APT script, this is now the only implementation. The same
# sequence was inline in pgadmin4-rpm-build, pgadmin4-rpm-snapshot,
# pgadmin4-rpm-publish-qa-to-prod and pgadmin4-repo-rpm-copy-to-repos, and in
# the pgaweb copy of this script.
#
# createrepo_c runs a full rebuild rather than --update, which is what both the
# manual and the automated paths have always done, and is the safe choice after
# packages have been removed by hand.

set -e

ROOT=/var/ftp/pgadmin4
ARCH=x86_64
DEFAULT_ROOT=${ROOT}
DEFAULT_ARCH=${ARCH}

usage() {
    cat >&2 <<USAGE
Usage: $0 [-r ROOT] [-a ARCH] <distro family> <distro name> <distro version>

  -r ROOT  the tree holding yum/<family> (default: ${DEFAULT_ROOT})
  -a ARCH  the package architecture (default: ${DEFAULT_ARCH})

  family   fedora or redhat
  name     fedora or rhel
  version  the major version, e.g. 10

Examples:
  $0 redhat rhel 10
  $0 -a aarch64 redhat rhel 10
  $0 -r /var/ftp/pgadmin4/snapshots/2026-09-17 fedora fedora 44
USAGE
    exit 1
}

while getopts 'r:a:' OPT; do
    case "${OPT}" in
        r) ROOT=${OPTARG} ;;
        a) ARCH=${OPTARG} ;;
        *) usage ;;
    esac
done
shift $((OPTIND - 1))

[ $# -eq 3 ] || usage
FAMILY=$1
NAME=$2
VERSION=$3

TREE=${ROOT}/yum/${FAMILY}/${NAME}-${VERSION}-${ARCH}

/usr/bin/createrepo_c "${TREE}"
/usr/bin/gpg --yes --detach-sign --armor "${TREE}/repodata/repomd.xml"

# Some EL variants report $releasever with a variant suffix, so the repository
# has to answer to each of the resulting directory names.
cd "${ROOT}/yum/${FAMILY}"
for VARIANT in Server Workstation Client; do
    ln -snf "${NAME}-${VERSION}-${ARCH}" "${NAME}-${VERSION}${VARIANT}-${ARCH}"
done
