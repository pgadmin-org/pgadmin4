#!/bin/sh

# move to the directory where we want to create the DMG
test -d $DISTROOT || mkdir $DISTROOT
cd $DISTROOT

DMG_SOURCES="./../mac-build/$APP_BUNDLE_NAME"
DMG_LICENCE=./../pkg/mac/licence.rtf
DMG_VOLUME_NAME=$APP_NAME
DMG_NAME=`echo $DMG_VOLUME_NAME | sed 's/ //g' | awk '{print tolower($0)}'`
DMG_IMAGE=$DMG_NAME-$APP_LONG_VERSION.dmg
HDIUTIL=/usr/bin/hdiutil
REZ="/usr/bin/Rez"

DMG_DIR=./$DMG_IMAGE.src

if test -e "$DMG_DIR"; then
	echo "Directory $DMG_DIR already exists. Please delete it manually." >&2
	exit 1
fi

echo "Cleaning up"
rm -f "$DMG_IMAGE" || exit 1
mkdir "$DMG_DIR" || exit 1

echo "Copying data into temporary directory"
for src in "$DMG_SOURCES"; do
	cp -R "$src" "$DMG_DIR" || exit 1
done

echo "Creating image"
$HDIUTIL create -quiet -srcfolder "$DMG_DIR" -format UDZO -volname "$DMG_VOLUME_NAME" -ov "$DMG_IMAGE" || exit 1
rm -rf "$DMG_DIR" || exit 1

echo "Attaching License to image"
python ./../pkg/mac/dmg-license.py "$DMG_IMAGE" "$DMG_LICENCE" -c bz2
