########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2018, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
#########################################################################

SHELL = /bin/sh

#########################################################################
# High-level targets
#########################################################################

# Include only platform-independent builds in all
all: docs pip src runtime

appbundle: docs
	./pkg/mac/build.sh

install-node:
	cd web && yarn install

bundle:
	cd web && yarn run bundle

bundle-dev:
	cd web && yarn run bundle:dev

linter:
	cd web && yarn run linter

check: install-node bundle linter
	cd web && pycodestyle --config=.pycodestyle . && yarn run karma start --single-run && python regression/runtests.py

check-pep8:
	cd web && pycodestyle --config=.pycodestyle .

check-python:
	cd web && python regression/runtests.py --exclude feature_tests

check-feature: install-node bundle
	cd web && python regression/runtests.py --pkg feature_tests

check-js: install-node linter
	cd web && yarn run karma start --single-run

runtime-debug:
	cd runtime && qmake CONFIG+=debug && make

runtime:
	cd runtime && qmake CONFIG+=release && make

# Include all clean sub-targets in clean
clean: clean-appbundle clean-docker clean-dist clean-docs clean-node clean-pip clean-src clean-runtime
	rm -rf web/pgadmin/static/js/generated/*
	rm -rf web/pgadmin/static/js/generated/.cache
	rm -rf web/pgadmin/static/css/generated/*
	rm -rf web/pgadmin/static/css/generated/.cache

clean-runtime:
	cd runtime && make clean

clean-appbundle:
	rm -rf mac-build/

clean-docker:
	rm -rf docker-build/

clean-dist:
	rm -rf dist/

clean-docs:
	LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 $(MAKE) -C docs/en_US -f Makefile.sphinx clean

clean-node:
	rm -rf web/node-modules/

clean-pip:
	rm -rf pip-build/

clean-src:
	rm -rf src-build/

docker:
	./pkg/docker/build.sh

docs:
	LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 $(MAKE) -C docs/en_US -f Makefile.sphinx html

docs-pdf:
	LC_ALL=en_US.UTF-8 LANG=en_US.UTF-8 $(MAKE) -C docs/en_US -f Makefile.sphinx latexpdf

messages: msg-extract msg-update msg-compile

msg-compile:
	cd web && pybabel compile --statistics -d pgadmin/translations

msg-extract:
	cd web && pybabel extract -F babel.cfg -o pgadmin/messages.pot pgadmin

msg-update:
	cd web && pybabel update -i pgadmin/messages.pot -d pgadmin/translations

.PHONY: docs

pip: docs
	./pkg/pip/build.sh

src:
	./pkg/src/build.sh
