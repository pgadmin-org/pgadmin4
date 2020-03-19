%global sname mod_wsgi

%{!?_httpd_apxs: %{expand: %%global _httpd_apxs %%{_sbindir}/apxs}}

%{!?_httpd_mmn: %{expand: %%global _httpd_mmn %%(cat %{_includedir}/httpd/.mmn 2>/dev/null || echo 0-0)}}
%{!?_httpd_confdir:    %{expand: %%global _httpd_confdir    %%{_sysconfdir}/httpd/conf.d}}
# /etc/httpd/conf.d with httpd < 2.4 and defined as /etc/httpd/conf.modules.d with httpd >= 2.4
%{!?_httpd_modconfdir: %{expand: %%global _httpd_modconfdir %%{_sysconfdir}/httpd/conf.d}}
%{!?_httpd_moddir: %{expand: %%global _httpd_moddir    %%{_libdir}/httpd/modules}}

%global debug_package %{nil}

Name:		pgadmin4-python3-%{sname}
Version:	4.7.1
Release:	2%{?dist}
Summary:	A WSGI interface for Python web applications in Apache (customized for pgAdmin4)
License:	ASL 2.0
URL:		https://modwsgi.readthedocs.io/
Source0:	https://github.com/GrahamDumpleton/%{sname}/archive/%{version}.tar.gz#/mod_wsgi-%{version}.tar.gz
Source2:	%{name}.conf
Patch1:		%{name}-exports.patch

Requires:	httpd-mmn = %{_httpd_mmn}
BuildRequires:	python3-devel
BuildRequires:	httpd-devel
BuildRequires:	gcc

# Suppress auto-provides for module DSO
%{?filter_provides_in: %filter_provides_in %{_httpd_moddir}/.*\.so$}
%{?filter_setup}

%global _description\
The mod_wsgi adapter is an Apache module that provides a WSGI compliant\
interface for hosting Python based web applications within Apache. The\
adapter is written completely in C code against the Apache C runtime and\
for hosting WSGI applications within Apache has a lower overhead than using\
existing WSGI adapters for mod_python or CGI.\

%description %_description

%prep
%autosetup -p1 -n %{sname}-%{version}

%build
export LDFLAGS="$RPM_LD_FLAGS -L%{_libdir}"
export CFLAGS="$RPM_OPT_FLAGS -fno-strict-aliasing"

%configure --enable-shared --with-apxs=%{_httpd_apxs} --with-python=python3
%{__make} %{?_smp_mflags}
%{_bindir}/python3 setup.py build

%install
%{__make} install DESTDIR=%{buildroot} LIBEXECDIR=%{_httpd_moddir}
%{__install} -d -m 755 %{buildroot}%{_httpd_modconfdir}
%{__install} -p -m 644 %{SOURCE2} %{buildroot}%{_httpd_modconfdir}/10-pgadmin4-python3-mod_wsgi.conf
%{_bindir}/python3 setup.py install -O1 --skip-build --root %{buildroot}
%{__mv} %{buildroot}%{_httpd_moddir}/mod_wsgi.so %{buildroot}%{_httpd_moddir}/pgadmin4-python3-mod_wsgi.so
%{__mv} %{buildroot}%{_bindir}/mod_wsgi-express %{buildroot}%{_bindir}/pgadmin4-mod_wsgi-express-3

%files
%license LICENSE
%doc CREDITS.rst README.rst
%config(noreplace) %{_httpd_modconfdir}/*pgadmin4-python3-mod_wsgi.conf
%{_httpd_moddir}/pgadmin4-python3-mod_wsgi.so
%{python3_sitearch}/mod_wsgi-*.egg-info
%{python3_sitearch}/mod_wsgi
%{_bindir}/pgadmin4-mod_wsgi-express-3

%changelog
* Fri Mar 6 2020 Devrim Gündüz <devrim@gunduz.org> - 4.6.8-2
- Initial packaging for the PostgreSQL YUM repository
