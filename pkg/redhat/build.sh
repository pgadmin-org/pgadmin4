#!/bin/bash

# Exit when any command fails
set -e

# Debugging shizz
trap 'ERRCODE=$? && if [ ${ERRCODE} -ne 0 ]; then echo "The command \"${BASH_COMMAND}\" failed in \"${FUNCNAME}\" with exit code ${ERRCODE}."; fi' EXIT

OS_VERSION=$(cat /etc/os-release | grep "^VERSION_ID=" | awk -F "=" '{ print $2 }' | sed 's/"//g')
OS_NAME=$(cat /etc/os-release | grep "^ID=" | awk -F "=" '{ print $2 }' | sed 's/"//g')
OS_ARCH=$(arch)

# Make sure we get the right libpq
export PATH=/usr/pgsql-14/bin:$PATH

# Common Linux build functions
source pkg/linux/build-functions.sh

# Assemble the "standard" installation footprint
_setup_env $0 "redhat"
_cleanup "rpm"
_setup_dirs
_create_python_virtualenv "redhat"
_build_runtime
_build_docs "redhat"
_copy_code

# Get an RPM-compatible version number
RPM_VERSION=${APP_RELEASE}.${APP_REVISION}
if [ ! -z ${APP_SUFFIX} ]; then
    RPM_VERSION=${RPM_VERSION}_${APP_SUFFIX}
fi

#
# Server package
#

# Create the Redhat packaging stuffs for the server
echo "Creating the server package..."

cat << EOF > "${BUILDROOT}/server.spec"
%global __requires_exclude_from ^/.*$
%global __provides_exclude_from ^/.*$
%global _build_id_links none

# Bytecompiling Python 3 doesn't work on RHEL/CentOS 7, so make it a no-op
%if 0%{?rhel} && 0%{?rhel} == 7
%define __python /bin/true
%endif

%undefine __brp_mangle_shebangs
%undefine __brp_ldconfig

Name:		${APP_NAME}-server
Version:	${RPM_VERSION}
Release:	1%{?dist}
Summary:	The core server package for pgAdmin.
License:	PostgreSQL
URL:		https://www.pgadmin.org/

Requires:	python3, postgresql-libs >= 11, krb5-libs

%description
The core server package for pgAdmin. pgAdmin is the most popular and feature rich Open Source administration and development platform for PostgreSQL, the most advanced Open Source database in the world.

%build

%install
cp -rfa %{pga_build_root}/server/* \${RPM_BUILD_ROOT}

%files
/usr/pgadmin4/*
EOF

# Build the Redhat package for the server
rpmbuild --define "pga_build_root ${BUILDROOT}" -bb "${BUILDROOT}/server.spec"

#
# Desktop package
#

# Create the Redhat packaging stuffs for the desktop
echo "Creating the desktop package..."

cat << EOF > "${BUILDROOT}/desktop.spec"
%global __requires_exclude_from ^/.*$
%global __provides_exclude_from ^/.*$
%global _build_id_links none

%undefine __brp_mangle_shebangs
%undefine __brp_ldconfig

Name:		${APP_NAME}-desktop
Version:	${RPM_VERSION}
Release:	1%{?dist}
Summary:	The desktop user interface for pgAdmin.
License:	PostgreSQL
URL:		https://www.pgadmin.org/
Requires:	${APP_NAME}-server = ${RPM_VERSION}, libatomic, xdg-utils

%description
The desktop user interface for pgAdmin. pgAdmin is the most popular and feature rich Open Source administration and development platform for PostgreSQL, the most advanced Open Source database in the world.

%build

%install
cp -rfa %{pga_build_root}/desktop/* \${RPM_BUILD_ROOT}

%post
/bin/xdg-icon-resource forceupdate

%files
/usr/pgadmin4/bin/*
/usr/share/icons/hicolor/128x128/apps/*
/usr/share/icons/hicolor/64x64/apps/*
/usr/share/icons/hicolor/48x48/apps/*
/usr/share/icons/hicolor/32x32/apps/*
/usr/share/icons/hicolor/16x16/apps/*
/usr/share/applications/*
EOF

# Build the Redhat package for the server
rpmbuild --define "pga_build_root ${BUILDROOT}" -bb "${BUILDROOT}/desktop.spec"


#
# Web package
#

# Create the Redhat packaging stuffs for the web
echo "Creating the web package..."

cat << EOF > "${BUILDROOT}/web.spec"
%global __requires_exclude_from ^/.*$
%global __provides_exclude_from ^/.*$
%global _build_id_links none

%undefine __brp_mangle_shebangs
%undefine __brp_ldconfig

Name:		${APP_NAME}-web
Version:	${RPM_VERSION}
Release:	1%{?dist}
BuildArch:	noarch
Summary:	The web interface for pgAdmin, hosted under Apache HTTPD.
License:	PostgreSQL
URL:		https://www.pgadmin.org/
%if 0%{?rhel} && 0%{?rhel} == 7
Requires:	${APP_NAME}-server = ${RPM_VERSION}, httpd, pgadmin4-python3-mod_wsgi
%else
Requires:	${APP_NAME}-server = ${RPM_VERSION}, httpd, python3-mod_wsgi
%endif

%description
The web interface for pgAdmin, hosted under Apache HTTPD. pgAdmin is the most popular and feature rich Open Source administration and development platform for PostgreSQL, the most advanced Open Source database in the world.

%build

%install
cp -rfa %{pga_build_root}/web/* \${RPM_BUILD_ROOT}

%files
/usr/pgadmin4/bin/*
%config(noreplace) /etc/httpd/conf.d/*
EOF

mkdir -p "${WEBROOT}/etc/httpd/conf.d"
cp "${SOURCEDIR}/pkg/redhat/pgadmin4.conf" "${WEBROOT}/etc/httpd/conf.d"

# Build the Redhat package for the web
rpmbuild --define "pga_build_root ${BUILDROOT}" -bb "${BUILDROOT}/web.spec"

#
# Meta package
#


# Create the Redhat packaging stuffs for the meta package
echo "Creating the meta package..."

cat << EOF > "${BUILDROOT}/meta.spec"
%global __requires_exclude_from ^/.*$
%global __provides_exclude_from ^/.*$
%global _build_id_links none

%undefine __brp_mangle_shebangs
%undefine __brp_ldconfig

Name:		${APP_NAME}
Version:	${RPM_VERSION}
Release:	1%{?dist}
BuildArch:	noarch
Summary:	Installs all required components to run pgAdmin in desktop and web modes.
License:	PostgreSQL
URL:		https://www.pgadmin.org/
Requires:	${APP_NAME}-server = ${RPM_VERSION}, ${APP_NAME}-desktop = ${RPM_VERSION}, ${APP_NAME}-web = ${RPM_VERSION}

%description
Installs all required components to run pgAdmin in desktop and web modes. pgAdmin is the most popular and feature rich Open Source administration and development platform for PostgreSQL, the most advanced Open Source database in the world.

%build

%install

%files

EOF

# Build the Redhat package for the meta package
rpmbuild --define "pga_build_root ${BUILDROOT}" -bb "${BUILDROOT}/meta.spec"

#
# mod_wsgi for CentOS 7
#
if [ ${OS_VERSION} == 7 ]; then
    cp "${SOURCEDIR}/pkg/redhat/pgadmin4-python3-mod_wsgi-exports.patch" ${HOME}/rpmbuild/SOURCES
    cp "${SOURCEDIR}/pkg/redhat/pgadmin4-python3-mod_wsgi.conf" ${HOME}/rpmbuild/SOURCES
    curl -o ${HOME}/rpmbuild/SOURCES/mod_wsgi-4.7.1.tar.gz https://codeload.github.com/GrahamDumpleton/mod_wsgi/tar.gz/4.7.1
    rpmbuild -bb "${SOURCEDIR}/pkg/redhat/pgadmin4-python-mod_wsgi.spec"
fi

# Get the libpq we need
yumdownloader -y --downloadonly --destdir=$DISTROOT postgresql14-libs

#
# Get the results!
#
cp ${HOME}/rpmbuild/RPMS/${OS_ARCH}/${APP_NAME}-*${RPM_VERSION}-*.${OS_ARCH}.rpm "${DISTROOT}/"
cp ${HOME}/rpmbuild/RPMS/noarch/${APP_NAME}-*${RPM_VERSION}-*.noarch.rpm "${DISTROOT}/"
if [ ${OS_VERSION} == 7 ]; then
    cp ${HOME}/rpmbuild/RPMS/${OS_ARCH}/pgadmin4-python3-mod_wsgi-4.7.1-2.el7.x86_64.rpm "${DISTROOT}/"
fi

echo "Completed. RPMs created in ${DISTROOT}."
