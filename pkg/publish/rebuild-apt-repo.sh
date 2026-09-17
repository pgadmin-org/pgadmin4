#!/bin/sh
#
# Index and sign one APT repository tree.
#
# This is the only implementation of that sequence. It previously existed five
# times: inline in the pgadmin4-deb-build, pgadmin4-deb-snapshot and
# pgadmin4-deb-publish-qa-to-prod Jenkins jobs, which differed from each other
# only in which directory they ran against, and again in the copy of this
# script that lived in the pgaweb repository for manual use after old releases
# were purged by hand.
#
# Run by hand with just a codename it does exactly what that copy did, against
# the production tree. The publishing automation passes -r to point it at a
# staging or snapshot tree instead.

set -e

ROOT=/var/ftp/pgadmin4
ARCHES="all amd64 i386"
DEFAULT_ROOT=${ROOT}
DEFAULT_ARCHES=${ARCHES}

usage() {
    cat >&2 <<USAGE
Usage: $0 [-r ROOT] [-a "ARCH ..."] <distro codename>

  -r ROOT   the tree holding apt/<codename> (default: ${DEFAULT_ROOT})
  -a ARCHES space separated architectures to index (default: ${DEFAULT_ARCHES})

Examples:
  $0 bookworm
  $0 -r /var/ftp/pgadmin4/snapshots/2026-09-17 bookworm
  $0 -a "all amd64 arm64" bookworm
USAGE
    exit 1
}

while getopts 'r:a:' OPT; do
    case "${OPT}" in
        r) ROOT=${OPTARG} ;;
        a) ARCHES=${OPTARG} ;;
        *) usage ;;
    esac
done
shift $((OPTIND - 1))

[ $# -eq 1 ] || usage
CODENAME=$1

# apt-ftparchive reads its Origin, Label, Suite and Description from this file.
# The architecture list is deliberately not read from it: it is overridden
# below from ARCHES, so that the set of architectures indexed and the set
# advertised in the signed Release file cannot drift apart. A package whose
# architecture is missing from Release is ignored by every client, silently.
CONF=$(dirname "$0")/aptftp.conf
[ -f "${CONF}" ] || { echo "Missing ${CONF}" >&2; exit 1; }

TREE=${ROOT}/apt/${CODENAME}
DISTS=${TREE}/dists/pgadmin4

for ARCH in ${ARCHES}; do
    mkdir -p "${DISTS}/main/binary-${ARCH}"
done

cd "${TREE}"
for ARCH in ${ARCHES}; do
    apt-ftparchive packages -c="${CONF}" "dists/pgadmin4/main/binary-${ARCH}" \
        > "dists/pgadmin4/main/binary-${ARCH}/Packages"
    gzip -f -k "dists/pgadmin4/main/binary-${ARCH}/Packages"
done

cd "${DISTS}"
apt-ftparchive -c="${CONF}" \
    -o "APT::FTPArchive::Release::Architectures=${ARCHES}" \
    release . > Release
gzip -f -k Release

rm -f Release.gpg
gpg -u packages@pgadmin.org -bao Release.gpg Release

rm -f InRelease
gpg -u packages@pgadmin.org --clear-sign --output InRelease Release
