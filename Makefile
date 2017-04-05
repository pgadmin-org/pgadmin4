########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2017, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
#########################################################################

SHELL = /bin/sh

#########################################################################
# High-level targets
#########################################################################

# Include only platform-independent builds in all
all: docs pip src

# Include all clean sub-targets in clean
clean: clean-dist clean-docs clean-pip clean-appbundle clean-src

pip: docs
	./pkg/pip/build.sh

appbundle: docs
	./pkg/mac/build.sh

appbundle-webkit: docs
	PGADMIN4_USE_WEBKIT=1 ./pkg/mac/build.sh

src:
	./pkg/src/build.sh

minimise:
	python web/tools/minimise.py ./web

msg-extract:
	cd web && pybabel extract -F babel.cfg -o pgadmin/messages.pot pgadmin

msg-update:
	cd web && pybabel update -i pgadmin/messages.pot -d pgadmin/translations

msg-compile:
	cd web && pybabel compile -d pgadmin/translations

docs:
	LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 $(MAKE) -C docs/en_US -f Makefile.sphinx html

clean-pip:
	rm -rf pip-build/

clean-appbundle:
	rm -rf mac-build/

clean-src:
	rm -rf src-build/

clean-docs:
	LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 $(MAKE) -C docs/en_US -f Makefile.sphinx clean

clean-dist:
	rm -rf dist/

check:
	python web/regression/runtests.py

.PHONY: docs
