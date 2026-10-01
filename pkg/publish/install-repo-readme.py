#!/usr/bin/python3
#
# Write the README that sits at the top of an APT or YUM repository tree.
#
# These were heredocs inline in five Jenkins jobs: pgadmin4-deb-readme-build
# and pgadmin4-deb-readme-snapshot for APT, and pgadmin4-repo-rpm-build,
# pgadmin4-repo-rpm-snapshot and pgadmin4-qa-repo-rpm-build for YUM. Only the
# base URL differed between them, so that is an argument and the prose is a
# template.
#
# The platform support table used to be maintained by hand in those heredocs,
# which is why the published one had drifted: it stopped at Noble whilst the
# job that wrote it listed Resolute. It is now derived.
#
# Where the facts come from:
#
#   Which platforms are supported   the repository directories that exist in
#                                   the tree being written. That is what a user
#                                   can actually install from today.
#
#   Which releases each carried     the S3 archive, not the download server.
#                                   Old releases are purged from the server as
#                                   they age, so deriving "first supported
#                                   release" from it would rewrite history
#                                   every time somebody tidied up: bookworm
#                                   reads as 7.8 on the server against 7.0 in
#                                   the archive. The sync has no --delete, so
#                                   the bucket keeps everything.
#
# For a snapshot or pre-release tree there is no history to show, every package
# being from the one build, so --no-archive emits a plain list of what is
# present and skips the archive entirely.

import argparse
import json
import os
import re
import subprocess
import sys

BUCKET = "pgadmin-archive.postgresql.org"

# The packages that carry the pgAdmin version. Deliberately a list rather than
# a prefix match: the repository RPMs have their own versioning (2-1), and
# pgadmin4-python3-mod_wsgi carries mod_wsgi's, so both would otherwise turn up
# as implausible pgAdmin releases.
VERSIONED_PACKAGES = ("pgadmin4", "pgadmin4-desktop", "pgadmin4-server",
                      "pgadmin4-web")

# aws s3 sync follows symlinks, so the EL compatibility links that
# rebuild-yum-repo.sh creates exist in the bucket as complete copies of the
# tree they point at. Counting them would invent platforms.
EL_COMPAT = re.compile(r"\d(?:Server|Workstation|Client)-")

DEB = re.compile(r"\A(?P<package>[a-z0-9.+-]+)_(?P<version>[^_]+)_"
                 r"(?P<arch>[a-z0-9]+)\.deb\Z")
RPM = re.compile(r"\A(?P<package>.+?)-(?P<version>[0-9][^-]*)-[^-]+\.rpm\Z")


def platform_key(platform):
    """Sort rhel-8 before rhel-10, and codenames alphabetically."""
    match = re.match(r"\A(.*?)-(\d+)\Z", platform)
    if match:
        return (match.group(1), int(match.group(2)))
    return (platform, 0)


def upstream_version(version):
    """Strip the packaging revision, leaving the pgAdmin release.

    Debian versions have carried one since 9.10 or so, as in 9.16-1.resolute,
    and RPM releases are separated the same way. What the table wants is the
    pgAdmin version, and mixing the two forms also sorts badly: 9.16-1.resolute
    compares below 9.3 unless the suffix goes first.
    """
    return version.split("-", 1)[0]


def version_key(version):
    """Sort 9.17 above 9.5, and anything unparseable below everything."""
    parts = []
    for piece in upstream_version(version).split("."):
        parts.append(int(piece) if piece.isdigit() else -1)
    return parts


def archive_keys(object_list=None):
    """Every object key in the archive, from S3 or from a captured listing."""
    if object_list:
        with open(object_list) as handle:
            return [line.strip() for line in handle if line.strip()]

    out = subprocess.run(
        ["/usr/bin/aws", "s3api", "list-objects-v2",
         "--bucket", BUCKET, "--prefix", "pgadmin4/",
         "--query", "Contents[].Key"],
        stdout=subprocess.PIPE, check=True).stdout
    return json.loads(out) or []


def parse_apt(key):
    """pgadmin4/apt/<codename>/dists/pgadmin4/main/binary-<arch>/<file>"""
    parts = key.split("/")
    if (len(parts) != 8 or parts[1] != "apt" or
            not parts[6].startswith("binary-")):
        return None
    match = DEB.match(parts[7])
    if not match or match.group("package") not in VERSIONED_PACKAGES:
        return None
    return parts[2], parts[6][len("binary-"):], match.group("version")


def parse_yum(key):
    """pgadmin4/yum/<family>/<name>-<version>-<arch>/<file>"""
    parts = key.split("/")
    if len(parts) != 5 or parts[1] != "yum" or EL_COMPAT.search(parts[3]):
        return None
    tree = parts[3]
    if "-" not in tree:
        return None
    platform, _, arch = tree.rpartition("-")
    match = RPM.match(parts[4])
    if not match or match.group("package") not in VERSIONED_PACKAGES:
        return None
    return platform, arch, match.group("version")


def collect(keys, kind):
    """{platform: {"arches": set, "versions": set}} from archive keys."""
    parse = parse_apt if kind == "apt" else parse_yum
    found = {}
    for key in keys:
        parsed = parse(key)
        if not parsed:
            continue
        platform, arch, version = parsed
        entry = found.setdefault(platform,
                                 {"arches": set(), "versions": set()})
        entry["arches"].add(arch)
        entry["versions"].add(upstream_version(version))
    return found


def scan_tree(root, kind):
    """{platform: set(arches)} for the repositories present in a tree."""
    base = os.path.join(root, kind)
    if not os.path.isdir(base):
        sys.exit("No such repository tree: %s" % base)

    found = {}
    if kind == "apt":
        for codename in sorted(os.listdir(base)):
            main = os.path.join(base, codename, "dists", "pgadmin4", "main")
            if not os.path.isdir(main):
                continue
            for entry in sorted(os.listdir(main)):
                if not entry.startswith("binary-"):
                    continue
                directory = os.path.join(main, entry)
                if any(DEB.match(f) and DEB.match(f).group("package")
                       in VERSIONED_PACKAGES for f in os.listdir(directory)):
                    found.setdefault(codename, set()).add(
                        entry[len("binary-"):])
    else:
        for family in sorted(os.listdir(base)):
            directory = os.path.join(base, family)
            if not os.path.isdir(directory):
                continue
            for tree in sorted(os.listdir(directory)):
                if EL_COMPAT.search(tree) or "-" not in tree:
                    continue
                full = os.path.join(directory, tree)
                if not os.path.isdir(full) or os.path.islink(full):
                    continue
                platform, _, arch = tree.rpartition("-")
                if any(RPM.match(f) and RPM.match(f).group("package")
                       in VERSIONED_PACKAGES for f in os.listdir(full)):
                    found.setdefault(platform, set()).add(arch)
    return found


def render_table(headings, rows):
    """An ASCII table in the style the hand-written READMEs used."""
    if not rows:
        return "(none)"
    widths = [max(len(str(r[i])) for r in [headings] + rows)
              for i in range(len(headings))]
    rule = "+" + "+".join("-" * (w + 2) for w in widths) + "+"

    def line(cells, centre):
        out = []
        for cell, width in zip(cells, widths):
            text = str(cell)
            out.append(" %s " % (text.center(width) if centre
                                 else text.ljust(width)))
        return "|" + "|".join(out) + "|"

    return "\n".join([rule, line(headings, False), rule] +
                     [line(r, True) for r in rows] + [rule])


def main():
    parser = argparse.ArgumentParser(
        description="Write a pgAdmin repository README.")
    parser.add_argument("kind", choices=("apt", "yum"))
    parser.add_argument("-r", "--root", default="/var/ftp/pgadmin4",
                        help="the tree holding apt/ and yum/")
    parser.add_argument("-u", "--base-url",
                        default="https://ftp.postgresql.org/pub/pgadmin"
                                "/pgadmin4",
                        help="what the instructions tell users to fetch from")
    parser.add_argument("--no-archive", action="store_true",
                        help="list only what this tree holds, with no release "
                             "history; for snapshot and pre-release trees")
    parser.add_argument("--object-list",
                        help="read archive keys from a file rather than S3")
    args = parser.parse_args()

    here = os.path.dirname(os.path.abspath(__file__))
    template_path = os.path.join(here, "README.%s.in" % args.kind)
    if not os.path.isfile(template_path):
        sys.exit("Missing %s" % template_path)
    with open(template_path) as handle:
        text = handle.read()

    present = scan_tree(args.root, args.kind)

    if args.no_archive:
        supported = render_table(
            ["Platform", "Architecture"],
            [[p, " ".join(sorted(present[p]))]
             for p in sorted(present, key=platform_key)])
    else:
        history = collect(archive_keys(args.object_list), args.kind)
        for platform in present:
            if platform not in history:
                sys.exit("%s is published but absent from the archive; the "
                         "archive sync has probably not run since it was "
                         "added" % platform)

        supported_rows, archived_rows = [], []
        for platform in sorted(history, key=platform_key):
            versions = sorted(history[platform]["versions"], key=version_key)
            arches = " ".join(sorted(history[platform]["arches"]))
            if platform in present:
                supported_rows.append([platform, arches, versions[0]])
            else:
                archived_rows.append([platform, arches,
                                      versions[0], versions[-1]])

        headings = ["Platform", "Architecture", "First supported release",
                    "Last supported release"]
        supported = render_table(headings[:3], supported_rows)
        archived = render_table(headings, archived_rows)

    # A snapshot or pre-release tree has no history to show, so the whole
    # section goes rather than being left saying "(none)".
    if args.no_archive:
        text = re.sub(r"@ARCHIVE_SECTION_START@\n"
                      r".*?@ARCHIVE_SECTION_END@\n\n?",
                      "", text, flags=re.S)
    else:
        text = text.replace("@ARCHIVE_SECTION_START@\n", "")
        text = text.replace("@ARCHIVE_SECTION_END@\n", "")
        text = text.replace("@ARCHIVED_TABLE@", archived)

    text = text.replace("@SUPPORTED_TABLE@", supported)
    text = text.replace("@BASE_URL@", args.base_url)

    if args.kind == "yum":
        tree = os.path.join(args.root, "yum")
        for name, placeholder in (("fedora", "@FEDORA_REPO_RPM@"),
                                  ("redhat", "@REDHAT_REPO_RPM@")):
            matches = sorted(f for f in os.listdir(tree)
                             if f.startswith("pgadmin4-%s-repo-" % name) and
                             f.endswith(".noarch.rpm"))
            if not matches:
                sys.exit("Could not find the %s repository RPM in %s"
                         % (name, tree))
            text = text.replace(placeholder, matches[-1])

    destination = os.path.join(args.root, args.kind, "README")
    with open(destination, "w") as handle:
        handle.write(text)
    print("Wrote %s" % destination)


if __name__ == "__main__":
    main()
