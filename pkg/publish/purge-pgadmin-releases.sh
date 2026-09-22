#!/bin/bash
#
# purge-pgadmin-releases.sh - Purge old pgAdmin releases
#
# Removes old pgAdmin version directories, APT packages, and YUM packages
# for a given major version, keeping only the specified version and later.
#
# Usage: purge-pgadmin-releases.sh [--live] <major.minor>
#
# Example: purge-pgadmin-releases.sh 9.11
#   This will purge versions 9.0 through 9.10 but NOT 8.x, 7.x, etc.
#
# By default runs in dry-run mode. Use --live to actually delete files.
#
# If an OS/distro repo directory only contains pgAdmin versions that would
# be purged, the most recent of those versions is kept so the repo is not
# left empty of that major version.

set -euo pipefail

BASE_DIR="/var/ftp/pgadmin4"
LIVE=0

usage() {
    echo "Usage: $0 [--live] <major.minor>"
    echo ""
    echo "  Purges all pgAdmin releases older than <major.minor> within the"
    echo "  same major version."
    echo ""
    echo "  --live    Actually delete files (default is dry-run)"
    echo ""
    echo "  Example: $0 9.11"
    echo "    Purges 9.0 through 9.10, keeps 9.11 and later."
    exit 1
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --live)
            LIVE=1
            shift
            ;;
        -h|--help)
            usage
            ;;
        -*)
            echo "Error: Unknown option: $1"
            usage
            ;;
        *)
            VERSION="$1"
            shift
            ;;
    esac
done

if [[ -z "${VERSION:-}" ]]; then
    echo "Error: Version argument is required."
    usage
fi

# Validate version format
if ! echo "$VERSION" | grep -qE '^[0-9]+\.[0-9]+$'; then
    echo "Error: Version must be in major.minor format (e.g. 9.11)"
    exit 1
fi

TARGET_MAJOR="${VERSION%%.*}"
TARGET_MINOR="${VERSION#*.}"

if [[ "$LIVE" -eq 1 ]]; then
    echo "*** LIVE MODE - files will be deleted ***"
else
    echo "*** DRY RUN MODE - no files will be deleted (use --live to delete) ***"
fi
echo ""
echo "Purging pgAdmin ${TARGET_MAJOR}.0 through ${TARGET_MAJOR}.$((TARGET_MINOR - 1))"
echo ""

# Helper: execute or print an rm command
do_rm() {
    if [[ "$LIVE" -eq 1 ]]; then
        rm -rf "$@"
    else
        echo "  Would remove: $*"
    fi
}

# Track totals
TOTAL_REMOVED=0
TOTAL_KEPT=0

###############################################################################
# 1. Purge version directories (e.g. /var/ftp/pgadmin4/v9.0)
###############################################################################
echo "=== Version directories ==="
for minor in $(seq 0 $((TARGET_MINOR - 1))); do
    VDIR="${BASE_DIR}/v${TARGET_MAJOR}.${minor}"
    if [[ -d "$VDIR" ]]; then
        do_rm "$VDIR"
        TOTAL_REMOVED=$((TOTAL_REMOVED + 1))
    fi
done
echo ""

###############################################################################
# 2. Purge APT packages
###############################################################################
echo "=== APT repositories ==="
for distro_dir in "${BASE_DIR}"/apt/*/; do
    [[ -d "$distro_dir" ]] || continue
    distro=$(basename "$distro_dir")

    # Find all binary directories under dists/pgadmin4/main/
    for bin_dir in "${distro_dir}"dists/pgadmin4/main/binary-*/; do
        [[ -d "$bin_dir" ]] || continue
        arch=$(basename "$bin_dir")

        # Collect pgadmin4 .deb files for the target major version in this dir
        # File patterns: pgadmin4_{ver}_all.deb, pgadmin4-desktop_{ver}_amd64.deb, etc.
        # Version in filename can be like "9.5" or "9.10-1.bookworm"
        declare -A versions_in_dir=()
        declare -A files_by_version=()

        while IFS= read -r -d '' deb_file; do
            fname=$(basename "$deb_file")
            # Extract version: pgadmin4[-something]_{VERSION}_{arch}.deb
            # VERSION is like "9.5" or "9.10-1.bookworm"
            pkg_ver=$(echo "$fname" | sed -E 's/^pgadmin4[^_]*_([0-9]+\.[0-9]+).*/\1/')
            pkg_major="${pkg_ver%%.*}"
            pkg_minor="${pkg_ver#*.}"

            if [[ "$pkg_major" == "$TARGET_MAJOR" ]]; then
                versions_in_dir["$pkg_minor"]=1
                files_by_version["${pkg_minor}:${deb_file}"]="$deb_file"
            fi
        done < <(find "$bin_dir" -maxdepth 1 -name "pgadmin4*.deb" -print0 2>/dev/null)

        [[ ${#versions_in_dir[@]} -eq 0 ]] && unset versions_in_dir files_by_version && continue

        # Determine which minor versions to purge (< TARGET_MINOR)
        purge_minors=()
        keep_minors=()
        for m in "${!versions_in_dir[@]}"; do
            if [[ "$m" -lt "$TARGET_MINOR" ]]; then
                purge_minors+=("$m")
            else
                keep_minors+=("$m")
            fi
        done

        # If ALL versions of this major would be purged, keep the highest
        highest_purge=""
        if [[ ${#keep_minors[@]} -eq 0 && ${#purge_minors[@]} -gt 0 ]]; then
            for m in "${purge_minors[@]}"; do
                if [[ -z "$highest_purge" || "$m" -gt "$highest_purge" ]]; then
                    highest_purge="$m"
                fi
            done
            echo "  [${distro}/${arch}] No versions >= ${TARGET_MAJOR}.${TARGET_MINOR} found; keeping ${TARGET_MAJOR}.${highest_purge}"
            TOTAL_KEPT=$((TOTAL_KEPT + 1))
        fi

        # Remove files for purged versions
        for key in "${!files_by_version[@]}"; do
            m="${key%%:*}"
            f="${key#*:}"
            if [[ "$m" -lt "$TARGET_MINOR" && "$m" != "$highest_purge" ]]; then
                do_rm "$f"
                TOTAL_REMOVED=$((TOTAL_REMOVED + 1))
            fi
        done

        unset versions_in_dir files_by_version
    done
done
echo ""

###############################################################################
# 3. Purge YUM/DNF packages
###############################################################################
echo "=== YUM repositories ==="
for vendor_dir in "${BASE_DIR}"/yum/*/; do
    [[ -d "$vendor_dir" ]] || continue
    vendor=$(basename "$vendor_dir")

    # Skip non-directory files (like the .noarch.rpm and README at the top level)
    for os_dir in "${vendor_dir}"*/; do
        [[ -d "$os_dir" ]] || continue
        # Skip symlinks (e.g. fedora-41Client-x86_64 -> fedora-41-x86_64)
        [[ -L "${os_dir%/}" ]] && continue
        os=$(basename "$os_dir")

        # Skip repodata directories and non-repo items
        [[ "$os" == "repodata" ]] && continue

        # Collect pgadmin4 RPMs for the target major version
        declare -A yum_versions_in_dir=()
        declare -A yum_files_by_version=()

        while IFS= read -r -d '' rpm_file; do
            fname=$(basename "$rpm_file")
            # Extract version: pgadmin4[-something]-{MAJOR}.{MINOR}-{release}.{dist}.{arch}.rpm
            pkg_ver=$(echo "$fname" | sed -E 's/.*pgadmin4[^0-9]*([0-9]+\.[0-9]+)-.*/\1/')
            pkg_major="${pkg_ver%%.*}"
            pkg_minor="${pkg_ver#*.}"

            if [[ "$pkg_major" == "$TARGET_MAJOR" ]]; then
                yum_versions_in_dir["$pkg_minor"]=1
                yum_files_by_version["${pkg_minor}:${rpm_file}"]="$rpm_file"
            fi
        done < <(find "$os_dir" -maxdepth 1 -name "pgadmin4*.rpm" -print0 2>/dev/null)

        [[ ${#yum_versions_in_dir[@]} -eq 0 ]] && unset yum_versions_in_dir yum_files_by_version && continue

        # Determine which minor versions to purge
        yum_purge_minors=()
        yum_keep_minors=()
        for m in "${!yum_versions_in_dir[@]}"; do
            if [[ "$m" -lt "$TARGET_MINOR" ]]; then
                yum_purge_minors+=("$m")
            else
                yum_keep_minors+=("$m")
            fi
        done

        # If ALL versions would be purged, keep the highest
        yum_highest_purge=""
        if [[ ${#yum_keep_minors[@]} -eq 0 && ${#yum_purge_minors[@]} -gt 0 ]]; then
            for m in "${yum_purge_minors[@]}"; do
                if [[ -z "$yum_highest_purge" || "$m" -gt "$yum_highest_purge" ]]; then
                    yum_highest_purge="$m"
                fi
            done
            echo "  [${vendor}/${os}] No versions >= ${TARGET_MAJOR}.${TARGET_MINOR} found; keeping ${TARGET_MAJOR}.${yum_highest_purge}"
            TOTAL_KEPT=$((TOTAL_KEPT + 1))
        fi

        # Remove files for purged versions
        for key in "${!yum_files_by_version[@]}"; do
            m="${key%%:*}"
            f="${key#*:}"
            if [[ "$m" -lt "$TARGET_MINOR" && "$m" != "$yum_highest_purge" ]]; then
                do_rm "$f"
                TOTAL_REMOVED=$((TOTAL_REMOVED + 1))
            fi
        done

        unset yum_versions_in_dir yum_files_by_version
    done
done
echo ""

###############################################################################
# Summary
###############################################################################
echo "=== Summary ==="
echo "Items to remove: ${TOTAL_REMOVED}"
if [[ "$TOTAL_KEPT" -gt 0 ]]; then
    echo "Repos where newest purge-candidate was kept (no newer versions present): ${TOTAL_KEPT}"
fi
if [[ "$LIVE" -eq 0 ]]; then
    echo ""
    echo "This was a dry run. Re-run with --live to actually delete."
fi
