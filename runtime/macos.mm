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

// Detect if we're running in Dark mode
bool IsDarkMode() {
    if (@available(macOS 10.14, *)) {
        NSString *interfaceStyle = [NSUserDefaults.standardUserDefaults valueForKey:@"AppleInterfaceStyle"];
        return [interfaceStyle isEqualToString:@"Dark"];
    } else {
        return NO;
    }
}
