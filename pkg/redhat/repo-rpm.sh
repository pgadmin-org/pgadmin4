#!/bin/bash

# Set the repo RPM version and build
REPO_RPM_VERSION=2
REPO_RPM_BUILD=1

# Set the repo base directory
if [ "x${PGADMIN_REPO_DIR}" == "x" ]; then
    echo "PGADMIN_REPO_DIR not set. Setting it to the default: https://ftp.postgresql.org/pub/pgadmin/pgadmin4/repos/yum"
    export PGADMIN_REPO_DIR=https://ftp.postgresql.org/pub/pgadmin/pgadmin4/repos/yum
fi

# Exit when any command fails
set -e

# Debugging shizz
trap 'last_command=$current_command; current_command=$BASH_COMMAND' DEBUG
trap 'if [ $? -ne 0 ]; then echo "\"${last_command}\" command filed with exit code $?."; fi' EXIT

OS_VERSION=$(cat /etc/os-release | grep "^VERSION_ID=" | awk -F "=" '{ print $2 }' | sed 's/"//g')
OS_NAME=$(cat /etc/os-release | grep "^ID=" | awk -F "=" '{ print $2 }' | sed 's/"//g')
OS_ARCH=$(arch)

# Common Linux build functions
source pkg/linux/build-functions.sh

# Are we installing a package key?
INCLUDE_KEY=0
if [ -f "pkg/redhat/PGADMIN_PKG_KEY" ]; then
    INCLUDE_KEY=1
    echo "Building repo RPMs including a package signing key..."
else
    echo "pkg/redhat/PGADMIN_PKG_KEY not found."
    echo "Building repo RPMs WITHOUT a package signing key..."
    sleep 5
fi

# Create the Redhat packaging stuffs for the repo
_create_repo_rpm() {
    DISTRO=$1
    if [ ${DISTRO} == "redhat" ]; then
        PLATFORM="rhel"
    else
        PLATFORM=${DISTRO}
    fi

    echo "Creating the repo package for ${DISTRO}..."
    test -d ${BUILDROOT}/${DISTRO}-repo/etc/yum.repos.d || mkdir -p ${BUILDROOT}/${DISTRO}-repo/etc/yum.repos.d

    cat << EOF > "${BUILDROOT}/${DISTRO}-repo/etc/yum.repos.d/pgadmin4.repo"
[pgAdmin4]
name=pgadmin4
baseurl=${PGADMIN_REPO_DIR}/${DISTRO}/${PLATFORM}-\$releasever-\$basearch
enabled=1
EOF

    if [ ${INCLUDE_KEY} -eq 1 ]; then
        echo repo_gpgcheck=1 >> "${BUILDROOT}/${DISTRO}-repo/etc/yum.repos.d/pgadmin4.repo"
        echo gpgcheck=1 >> "${BUILDROOT}/${DISTRO}-repo/etc/yum.repos.d/pgadmin4.repo"
        echo gpgkey=file:///etc/pki/rpm-gpg/PGADMIN_PKG_KEY >> "${BUILDROOT}/${DISTRO}-repo/etc/yum.repos.d/pgadmin4.repo"
    else
        echo gpgcheck=0 >> "${BUILDROOT}/${DISTRO}-repo/etc/yum.repos.d/pgadmin4.repo"
    fi

    echo "Creating the spec file for ${DISTRO}..."
    cat << EOF > "${BUILDROOT}/${DISTRO}-repo.spec"
%global __requires_exclude_from ^/.*$
%global __provides_exclude_from ^/.*$

Name:		${APP_NAME}-${DISTRO}-repo
Version:	${REPO_RPM_VERSION}
Release:	${REPO_RPM_BUILD}
BuildArch:	noarch
Summary:	Repository configuration for the pgAdmin ${DISTRO^} repositories.
License:	PostgreSQL
URL:		https://www.pgadmin.org/

%description
The yum repository configuration for ${DISTRO^} platforms.

%build

%install
cp -rfa %{pga_build_root}/${DISTRO}-repo/* \${RPM_BUILD_ROOT}

%files
/etc/yum.repos.d/pgadmin4.repo
EOF

    if [ ${INCLUDE_KEY} -eq 1 ]; then
        cat << EOF >> ${BUILDROOT}/${DISTRO}-repo.spec
/etc/pki/rpm-gpg/PGADMIN_PKG_KEY
EOF
        test -d ${BUILDROOT}/${DISTRO}-repo/etc/pki/rpm-gpg || mkdir -p ${BUILDROOT}/${DISTRO}-repo/etc/pki/rpm-gpg
        cp pkg/redhat/PGADMIN_PKG_KEY ${BUILDROOT}/${DISTRO}-repo/etc/pki/rpm-gpg/
    fi

    # Build the package
    echo "Building the repo RPM for ${DISTRO}..."
    rpmbuild --define "pga_build_root ${BUILDROOT}" -bb "${BUILDROOT}/${DISTRO}-repo.spec"
}

_setup_env $0 "redhat"
_create_repo_rpm redhat
_create_repo_rpm fedora

#
# Get the results!
#
test -d "${DISTROOT}/" || mkdir -p "${DISTROOT}/"
cp ${HOME}/rpmbuild/RPMS/noarch/${APP_NAME}-*-repo-${REPO_RPM_VERSION}-${REPO_RPM_BUILD}.noarch.rpm "${DISTROOT}/"