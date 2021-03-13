let
  pkgs = import <nixos-unstable>{};
in
pkgs.mkShell {
  buildInputs = [
    pkgs.postgresql
    pkgs.python37Packages.pip
    pkgs.python37Packages.setuptools
    pkgs.python37Packages.virtualenv
    pkgs.python37Packages.virtualenvwrapper
    pkgs.heimdal.dev
    pkgs.nodePackages.npm
    pkgs.nodePackages.yarn
    pkgs.autoconf
    pkgs.automake
    pkgs.libtool
    pkgs.nasm
    pkgs.pkgconfig
    pkgs.zlib
    pkgs.zlib.dev ## https://github.com/imagemin/optipng-bin/issues/84#issuecomment-437189811
    ## -- TODO: check if these are indeed needed
    pkgs.libpng12.dev
    pkgs.libwebp
    pkgs.libjpeg.dev
    ## --
    pkgs.chromedriver ## for running tests(graphical tests don't work though)
  ];
  shellHook = ''
    LD_LIBRARY_PATH=${pkgs.stdenv.cc.cc.lib}/lib/
    LD=$CC ## For https://github.com/imagemin/optipng-bin/issues/108#issuecomment-779268575
  '';
}
