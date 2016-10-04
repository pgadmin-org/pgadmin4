#!/bin//sh

DMG_VOLUME_NAME=$APP_NAME
DMG_NAME=`echo $DMG_VOLUME_NAME | sed 's/ //g' | awk '{print tolower($0)}'`
DMG_IMAGE=$DISTROOT/$DMG_NAME-$APP_LONG_VERSION.dmg

if ! test -f "${DMG_IMAGE}" ; then
	echo "${DMG_IMAGE} is no disk image!" >&2
	exit 1
fi

# Get the config
source codesign.conf

SCRIPT_DIR=`pwd`

# Sign the .app
echo Signing ${DMG_IMAGE}
codesign --sign "${DEVELOPER_ID}" --verbose --force "${DMG_IMAGE}"

# Verify it worked
echo Verifying the signature
codesign --verify --verbose --force "${DMG_IMAGE}"
RETURN_STATUS=$?
if [ $RETURN_STATUS -ne 0 ]; then
  echo ERROR: Code signing did not work
  exit 1
else
  echo ${DMG_IMAGE} successfully signed
fi