//////////////////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2020, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
// macos.mm - macOS-specific Objective-C/C++ functions
//
//////////////////////////////////////////////////////////////////////////

#import <Cocoa/Cocoa.h>
#import <Availability.h>

// Detect if we're running in Dark mode
bool IsDarkMode() {
#ifdef __MAC_10_14
    if (@available(macOS 10.14, *)) {
        NSString *interfaceStyle = [NSUserDefaults.standardUserDefaults valueForKey:@"AppleInterfaceStyle"];
        return [interfaceStyle isEqualToString:@"Dark"];
    } else {
        return NO;
    }
#else
    return NO;
#endif
}
