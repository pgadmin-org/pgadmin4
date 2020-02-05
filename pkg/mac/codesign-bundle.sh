#!/bin/sh

BUNDLE="$1"

if ! test -d "${BUNDLE}" ; then
	echo "${BUNDLE} is no bundle!" >&2
	exit 1
fi

# Get the config
source codesign.conf

# Sign the .app
echo Signing ${BUNDLE}
codesign --deep --force --verify --verbose --timestamp --options runtime -i "${DEVELOPER_BUNDLE_ID}" --sign "${DEVELOPER_ID}" "${BUNDLE}"

# Verify it worked
echo Verifying the signature
codesign --verify --verbose --deep --force "${BUNDLE}"
RETURN_STATUS=$?
if [ ${RETURN_STATUS} -ne 0 ]; then
  echo Code signing did not work, check the log
  exit 1
else
  echo ${BUNDLE} successfully signed
fi
