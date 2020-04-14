##########################################################################
#
# pgAdmin 4 - PostgreSQL Tools
#
# Copyright (C) 2013 - 2020, The pgAdmin Development Team
# This software is released under the PostgreSQL Licence
#
#########################################################################

"""This File Provides ipv4 and ipv6 address check."""

import re

IPV4SEG = r'(?:25[0-5]|(?:2[0-4]|1{0,1}[0-9]){0,1}[0-9])'
IPV4ADDR = r'(?:(?:' + IPV4SEG + r'\.){3,3}' + IPV4SEG + r')'
IPV6SEG = r'(?:(?:[0-9a-fA-F]){1,4})'
IPV6GROUPS = (
    # 1:2:3:4:5:6:7:8
    r'(?:' + IPV6SEG + r':){7,7}' + IPV6SEG,
    # 1::                                 1:2:3:4:5:6:7::
    r'(?:' + IPV6SEG + r':){1,7}:',
    # 1::8               1:2:3:4:5:6::8   1:2:3:4:5:6::8
    r'(?:' + IPV6SEG + r':){1,6}:' + IPV6SEG,
    # 1::7:8             1:2:3:4:5::7:8   1:2:3:4:5::8
    r'(?:' + IPV6SEG + r':){1,5}(?::' + IPV6SEG + r'){1,2}',
    # 1::6:7:8           1:2:3:4::6:7:8   1:2:3:4::8
    r'(?:' + IPV6SEG + r':){1,4}(?::' + IPV6SEG + r'){1,3}',
    # 1::5:6:7:8         1:2:3::5:6:7:8   1:2:3::8
    r'(?:' + IPV6SEG + r':){1,3}(?::' + IPV6SEG + r'){1,4}',
    # 1::4:5:6:7:8       1:2::4:5:6:7:8   1:2::8
    r'(?:' + IPV6SEG + r':){1,2}(?::' + IPV6SEG + r'){1,5}',
    # 1::3:4:5:6:7:8     1::3:4:5:6:7:8   1::8
    IPV6SEG + r':(?:(?::' + IPV6SEG + r'){1,6})',
    # ::2:3:4:5:6:7:8    ::2:3:4:5:6:7:8  ::8       ::
    r':(?:(?::' + IPV6SEG + r'){1,7}|:)',
    # fe80::7:8%eth0   fe80::7:8%1  (link-local IPv6 addresses with zone index)
    r'fe80:(?::' + IPV6SEG + r'){0,4}%[0-9a-zA-Z]{1,}',
    # ::255.255.255.255  ::ffff:255.255.255.255  ::ffff:0:255.255.255.255
    # (IPv4-mapped IPv6 addresses and IPv4-translated addresses)
    r'::(?:ffff(?::0{1,4}){0,1}:){0,1}[^\s:]' + IPV4ADDR,
    # 2001:db8:3:4::192.0.2.33  64:ff9b::192.0.2.33
    # (IPv4-Embedded IPv6 Address)
    r'(?:' + IPV6SEG + r':){1,4}:[^\s:]' + IPV4ADDR,
)
# Reverse rows for greedy match
IPV6ADDR = '|'.join(['(?:{})'.format(g) for g in IPV6GROUPS[::-1]])

ip6re = re.compile(IPV6ADDR)
ip4re = re.compile(IPV4ADDR)


def is_valid_ip4address(addr):
    return ip4re.match(addr)


def is_valid_ip6address(addr):
    return ip6re.match(addr)


def is_valid_ipaddress(addr):
    return ip4re.match(addr) or is_valid_ip6address(addr)
