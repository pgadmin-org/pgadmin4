########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2016, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
#########################################################################

SHELL = /bin/sh

#########################################################################
# High-level targets
#########################################################################

all: docs install-pip-requirements pip appbundle

clean: clean-pip clean-docs clean-appbundle

#########################################################################
# Python PIP package
#########################################################################

ERROR_PERMISSIONS = by 'make install-pip-requirements'. The user must have permission to add files to site-packages for Python installation/virtual environment

IS_WHEEL_INSTALLED=0
WHEEL_CHECK_CMD = which pip &> /dev/null && pip list wheel | grep wheel 2> /dev/null
WHEEL_INSTALL_CMD = pip install wheel

IS_PIP_INSTALLED=0
PIP_INSTALL_CMD = easy_install pip
PIP_CHECK_CMD = which pip &> /dev/null && pip show pip | grep Metadata-Version 2>/dev/null

PGADMIN_SRC_DIR = pgadmin4
PGADMIN_EGG = ${PGADMIN_SRC_DIR}.egg-info
PGADMIN_BUILD = build
PGADMIN_MACBUILD = mac-build
PGADMIN_DIST = dist
PGADMIN_MANIFEST = MANIFEST.in
PGADMIN_INSTALL_CMD = pip install --use-wheel --find-links=${PGADMIN_DIST} ${PGADMIN_SRC_DIR}


define create_manifest
@printf 'recursive-include ${PGADMIN_SRC_DIR} *\nglobal-exclude pgadmin4.db *.pyc' > ${PGADMIN_MANIFEST}
endef

define build
    python pkg/pip/setup_pip.py bdist_wheel
endef


install-pip-requirements:
ifeq ($(shell ${PIP_CHECK_CMD}),)
	${PIP_INSTALL_CMD}
	$(eval IS_PIP_INSTALLED=1)
endif

ifeq ($(shell ${WHEEL_CHECK_CMD}),)
	${WHEEL_INSTALL_CMD}
	$(eval IS_WHEEL_INSTALLED=1)
endif

pip:
ifeq ($(shell ${PIP_CHECK_CMD}),)
	@if [ $(value IS_PIP_INSTALLED) -ne 1 ]; \
        then \
                echo >&2 "Install pip ${ERROR_PERMISSIONS}"; \
                false; \
        fi
endif

ifeq ($(shell ${WHEEL_CHECK_CMD}),)
	@if [ $(value IS_WHEEL_INSTALLED) -ne 1 ]; \
	then \
		echo >&2 "Install wheel ${ERROR_PERMISSIONS}"; \
		false; \
	fi
endif
	rm -rf ${PGADMIN_SRC_DIR}
	cp -r web ${PGADMIN_SRC_DIR}
	$(call create_manifest)
	$(call build)

install-pip:
	${PGADMIN_INSTALL_CMD}

appbundle: docs
	./pkg/mac/build.sh

docs:
	LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 $(MAKE) -C docs/en_US -f Makefile.sphinx html

clean-docs:
	LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 $(MAKE) -C docs/en_US -f Makefile.sphinx clean

clean-pip:
	rm -rf ${PGADMIN_SRC_DIR}
	rm -rf ${PGADMIN_EGG}
	rm -rf ${PGADMIN_BUILD}
	rm -rf ${PGADMIN_DIST}
	rm -f ${PGADMIN_MANIFEST}

clean-appbundle:
	rm -rf ${PGADMIN_MACBUILD}
	rm -rf ${PGADMIN_DIST}/pgadmin4*.dmg*

.PHONY: docs
