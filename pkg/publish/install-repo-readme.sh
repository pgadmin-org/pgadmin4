#!/bin/sh
#
# Write the README that sits at the top of an APT or YUM repository tree.
#
# These were heredocs inline in five Jenkins jobs: pgadmin4-deb-readme-build
# and pgadmin4-deb-readme-snapshot for APT, and pgadmin4-repo-rpm-build,
# pgadmin4-repo-rpm-snapshot and pgadmin4-qa-repo-rpm-build for YUM. The only
# difference between the copies was the base URL the instructions point at, so
# that is the argument and the text itself is a file.
#
# The YUM README names the current repository RPMs, which is why it cannot
# simply be copied: the filenames are read from the tree being written.

set -e

ROOT=/var/ftp/pgadmin4
BASE_URL=https://ftp.postgresql.org/pub/pgadmin/pgadmin4
DEFAULT_ROOT=${ROOT}
DEFAULT_BASE_URL=${BASE_URL}

usage() {
    cat >&2 <<USAGE
Usage: $0 [-r ROOT] [-u BASE_URL] <apt|yum>

  -r ROOT      the tree holding apt/ and yum/ (default: ${DEFAULT_ROOT})
  -u BASE_URL  what the instructions tell users to fetch from
               (default: ${DEFAULT_BASE_URL})

Examples:
  $0 apt
  $0 -r /var/ftp/pgadmin4/snapshots/2026-09-17 \\
     -u https://ftp.postgresql.org/pub/pgadmin/pgadmin4/snapshots/2026-09-17 yum
USAGE
    exit 1
}

while getopts 'r:u:' OPT; do
    case "${OPT}" in
        r) ROOT=${OPTARG} ;;
        u) BASE_URL=${OPTARG} ;;
        *) usage ;;
    esac
done
shift $((OPTIND - 1))

[ $# -eq 1 ] || usage
KIND=$1
case "${KIND}" in
    apt|yum) ;;
    *) usage ;;
esac

HERE=$(dirname "$0")
TEMPLATE=${HERE}/README.${KIND}.in
[ -f "${TEMPLATE}" ] || { echo "Missing ${TEMPLATE}" >&2; exit 1; }

TREE=${ROOT}/${KIND}
[ -d "${TREE}" ] || { echo "No such repository tree: ${TREE}" >&2; exit 1; }

# The repository RPM filenames carry a version, so they are read from the tree
# rather than assumed. Newest wins, matching the `ls -r` the jobs used.
if [ "${KIND}" = "yum" ]; then
    FEDORA_RPM=$(cd "${TREE}" && ls -r pgadmin4-fedora-repo-*.noarch.rpm 2>/dev/null | head -1)
    REDHAT_RPM=$(cd "${TREE}" && ls -r pgadmin4-redhat-repo-*.noarch.rpm 2>/dev/null | head -1)
    if [ -z "${FEDORA_RPM}" ] || [ -z "${REDHAT_RPM}" ]; then
        echo "Could not find the repository RPMs in ${TREE}" >&2
        exit 1
    fi
    sed -e "s|@BASE_URL@|${BASE_URL}|g" \
        -e "s|@FEDORA_REPO_RPM@|${FEDORA_RPM}|g" \
        -e "s|@REDHAT_REPO_RPM@|${REDHAT_RPM}|g" \
        "${TEMPLATE}" > "${TREE}/README"
else
    sed -e "s|@BASE_URL@|${BASE_URL}|g" "${TEMPLATE}" > "${TREE}/README"
fi

echo "Wrote ${TREE}/README"
