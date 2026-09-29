#!/bin/bash
#
# selftest.sh: exercise the pga-publish request parser without touching
# anything. Every case runs the wrapper in --dry-run mode, which prints the
# argv it would have executed rather than executing it, so this is safe to run
# on a workstation, on a staging host, or on the download server itself.
#
# The interesting half of the table is the rejections. A parser that accepts
# the right things is table stakes; a parser that refuses a semicolon, a
# backtick, a newline and a `..` is the reason this wrapper exists, and those
# cases should be extended every time somebody thinks of a new way in.
#
# Usage: ./selftest.sh [path-to-pga-publish]

set -u

WRAPPER="${1:-$(dirname "$0")/pga-publish}"

pass=0
fail=0

# check <expected-exit> <role> <description> <request...>
check() {
    local expected="$1"; shift
    local role="$1"; shift
    local description="$1"; shift

    local output
    output="$("$WRAPPER" --dry-run --role "$role" "$@" 2>&1)"
    local rc=$?

    if [ "$rc" = "$expected" ]; then
        pass=$((pass + 1))
        printf 'ok    %-3s %s\n' "$rc" "$description"
    else
        fail=$((fail + 1))
        printf 'FAIL  %-3s (wanted %s) %s\n' "$rc" "$expected" "$description"
        printf '        %s\n' "$output"
    fi
}

# check_ssh <expected-exit> <description> <raw SSH_ORIGINAL_COMMAND>
#
# The other helper drives --dry-run, which takes its request from argv and so
# joins it with single spaces. Production takes the raw string sshd puts in
# SSH_ORIGINAL_COMMAND, which keeps runs of whitespace, tabs, and whatever else
# the client sent. Only rejections are tested this way: an accepted request
# would run for real, and the point of these cases is that none of them gets
# that far.
check_ssh() {
    local expected="$1"; shift
    local description="$1"; shift

    local output
    output="$(SSH_ORIGINAL_COMMAND="$1" "$WRAPPER" 2>&1)"
    local rc=$?

    if [ "$rc" = "$expected" ]; then
        pass=$((pass + 1))
        printf 'ok    %-3s %s\n' "$rc" "$description"
    else
        fail=$((fail + 1))
        printf 'FAIL  %-3s (wanted %s) %s\n' "$rc" "$expected" "$description"
        printf '        %s\n' "$output"
    fi
}

echo "== accepted requests: staging role (the staging server) =="
check 0 staging "hello"                         hello
check 0 staging "stage-create"                  stage-create 2026-09-17
check 0 staging "stage-create with -N suffix"   stage-create 2026-09-17-2
check 0 staging "stage-list"                    stage-list
check 0 staging "stage-exists"                  stage-exists 2026-09-17
check 0 staging "stage-index-apt"               stage-index-apt 2026-09-17
check 0 staging "stage-index-yum"               stage-index-yum 2026-09-17

echo
echo "== accepted requests: download role (the download server) =="
check 0 download "snapshot-create"               snapshot-create 2026-09-17
check 0 download "snapshot-sign"                 snapshot-sign 2026-09-17
check 0 download "snapshot-index-apt"            snapshot-index-apt 2026-09-17
check 0 download "snapshot-index-yum"            snapshot-index-yum 2026-09-17
check 0 download "snapshot-purge"                snapshot-purge
check 0 download "release-exists"               release-exists 9.18
check 0 download "release-create"               release-create 9.18
check 0 download "release-create with patch"    release-create 9.18.1
check 0 download "release-fetch"                release-fetch 9.18 2026-09-17
check 0 download "packages-fetch"               packages-fetch 2026-09-17
check 0 download "snapshot-create"              snapshot-create 2026-09-17
check 0 download "rebuild-apt"                  rebuild-apt bookworm
check 0 download "rebuild-yum"                  rebuild-yum redhat rhel 9 x86_64
check 0 download "create-release"               create-release 9.18
check 0 download "load-docs"                    load-docs 9.18
check 0 download "purge-cache"                  purge-cache
check 0 download "sync-s3"                      sync-s3

echo
echo "== rejected: shell metacharacters (exit 64) =="
check 64 staging "semicolon"                    "stage-create 2026-09-17; id"
check 64 staging "ampersands"                   "stage-create 2026-09-17 && id"
check 64 staging "pipe"                         "stage-create 2026-09-17 | sh"
check 64 staging "command substitution"         'stage-create $(id)'
check 64 staging "backticks"                    'stage-create `id`'
check 64 staging "variable expansion"           'stage-create $HOME'
check 64 staging "newline"                      "$(printf 'stage-create 2026-09-17\nrebuild-apt bookworm')"
check 64 staging "tab"                          "$(printf 'stage-create\t2026-09-17')"
check 64 staging "single quotes"                "stage-create '2026-09-17'"
check 64 staging "redirection"                  "stage-create 2026-09-17 > /etc/passwd"
check 64 staging "NUL-adjacent control char"    "$(printf 'stage-create 2026-09-17\r')"

echo
echo "== rejected: path traversal (exit 64) =="
check 64 staging "absolute path"                "stage-create /etc"
check 64 staging "relative traversal"           "stage-create ../../etc"
check 64 staging "bare dot-dot"                 "stage-create .."
check 64 staging "dot-dot inside a name"        "stage-create 2026-09-17..x"
check 64 staging "hidden directory"             "stage-create .ssh"
check 64 download "traversal in version"        "release-create ../../etc"

echo
echo "== rejected: malformed arguments (exit 64) =="
check 64 staging "unknown verb"                 "no-such-verb"
check 64 staging "empty request"                ""
check 64 staging "missing argument"             "stage-create"
check 64 staging "extra argument"               "stage-create 2026-09-17 2026-09-18"
check 64 staging "impossible date"              "stage-create 2026-13-45"
check 64 staging "date before the build farm"   "stage-create 1999-01-01"
check 64 staging "date far in the future"       "stage-create 2099-01-01"
check 64 staging "datestamp that is not a date" "stage-create latest"
check 64 download "version with four parts"     "release-create 9.18.1.2"
check 64 download "version with letters"        "release-create 9.18beta"
check 64 staging "over-long request"            "stage-create $(printf '2%.0s' $(seq 1 300))"

echo
echo "== rejected: not permitted (exit 77) =="
check 77 staging  "download verb on staging"    "release-create 9.18"
check 77 download "staging verb on download"    "stage-create 2026-09-17"
check 77 download "codename not allowlisted"    "rebuild-apt sarge"
check 77 download "yum target not allowlisted"  "rebuild-yum redhat rhel 7 x86_64"
check 77 download "mismatched yum tuple"        "rebuild-yum fedora rhel 9 x86_64"
check 64 download "sync-s3 takes no argument"   "sync-s3 release"
check 77 download "unpublished yum arch"        "rebuild-yum redhat rhel 9 aarch64"
check 77 download "unpublished apt codename"    "rebuild-apt plucky"

echo
echo "== through the real entry point, SSH_ORIGINAL_COMMAND =="
check_ssh 64 "tab instead of a space"            "$(printf 'stage-create\t2026-09-17')"
check_ssh 64 "embedded newline"                  "$(printf 'hello\nstage-create 2026-09-17')"
check_ssh 64 "trailing carriage return"          "$(printf 'hello\r')"
check_ssh 64 "Cyrillic homoglyph in the verb"    "ѕtage-create 2026-09-17"
check_ssh 64 "non-ASCII in an argument"          "rebuild-apt bookwоrm"
check_ssh 64 "NUL-ish escape in the request"     "$(printf 'hello\\x00')"

echo
echo "== an argument may not look like an option =="
check 64 download "leading hyphen as a codename"   "rebuild-apt -r"
check 64 download "leading hyphen as a datestamp"  "snapshot-sign -rf"
check 64 staging  "lone hyphen"                    "stage-exists -"

echo
echo "== the dry-run flag is not reachable from a client =="
# With SSH_ORIGINAL_COMMAND set, our own argv is ignored entirely, so a client
# that somehow contrived to influence it still cannot turn on dry-run, cannot
# choose a role, and cannot smuggle in a second request. On a host with no
# /etc/pga-publish.role this exits 69; on a real server it runs `hello`. What
# matters is that release-create does not appear in the output either way.
output="$(SSH_ORIGINAL_COMMAND=hello "$WRAPPER" --dry-run --role download \
          release-create 9.18 2>&1)"
if printf '%s' "$output" | grep -q "would create"; then
    fail=$((fail + 1))
    echo "FAIL      client reached --dry-run and release-create"
else
    pass=$((pass + 1))
    echo "ok        argv ignored when SSH_ORIGINAL_COMMAND is set"
fi

echo
echo "passed $pass, failed $fail"
[ "$fail" = 0 ]
