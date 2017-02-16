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

src:
	./pkg/src/build.sh

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
