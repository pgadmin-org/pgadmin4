# -*- coding: utf-8 -*-

import argparse
import os
import platform
import subprocess
import sys
import requests
import zipfile
import stat


# --- Helper Functions for Auto-Detection ---


def _find_chrome_executable():
    """Find the Chrome executable path on Linux or macOS."""
    system = platform.system()

    if system == 'Darwin':
        # macOS standard location
        paths = [
            '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        ]
    elif system == 'Linux':
        # Common Linux executables (Chromium and Google Chrome)
        paths = [
            'google-chrome',
            'google-chrome-stable',
            'chromium',
            'chromium-browser',
        ]
    else:
        return None

    for path in paths:
        try:
            # Check if the command/path is callable (using 'which' or
            # direct check)
            if system == 'Linux':
                # Use 'which' for common Linux commands/paths
                result = subprocess.run(
                    ['which', path],
                    capture_output=True,
                    text=True,
                    check=False
                )
                if result.returncode == 0:
                    return result.stdout.strip()

            # For macOS, or if 'which' failed/is unavailable, check direct path
            if os.path.exists(path):
                return path

        except FileNotFoundError:
            continue

    return None


def read_command_line():
    """Read the command line arguments.
    The 'chrome' argument is now removed."""
    parser = argparse.ArgumentParser(
        description=(
            'Auto-detects Chrome version, gets the correct Chromedriver '
            'using Chrome for Testing, and saves it.'
        )
    )

    # Only accept the directory argument
    parser.add_argument(
        'directory',
        metavar='DIRECTORY',
        help='the directory in which to save chromedriver'
    )

    return parser.parse_args()


def get_chrome_version():
    """Get the Chrome version number via OS-specific auto-detection."""
    full_version = None

    if platform.system() == 'Windows':
        try:
            import winreg

            def _read_registry(root, key, value):
                try:
                    with winreg.OpenKey(root, key) as hkey:
                        val, _ = winreg.QueryValueEx(hkey, value)
                        return val
                except Exception:
                    return None

            keys = [
                r'SOFTWARE\Google\Chrome\BLBeacon',
                r'SOFTWARE\Wow6432Node\Google\Chrome\BLBeacon',
            ]
            version_str = None
            for key in keys:
                version_str = _read_registry(
                    winreg.HKEY_CURRENT_USER, key, 'Version'
                )
                if version_str:
                    break

            if not version_str:
                print(
                    'Error: The Chrome version could not be read '
                    'from the Windows registry.'
                )
                sys.exit(1)

            full_version = (
                version_str.split()[-1].strip()
                if version_str.split()
                else version_str.strip()
            )

        except ImportError:
            print("Error: The 'winreg' module is required on Windows.")
            sys.exit(1)
        except Exception as e:
            print(f"Error reading Windows registry: {e}")
            sys.exit(1)

    else:
        chrome_executable = _find_chrome_executable()

        if not chrome_executable:
            print(
                'Error: Could not find the Google Chrome or Chromium '
                'executable in common locations.'
            )
            sys.exit(1)

        try:
            result = subprocess.run(
                [chrome_executable, '--version'],
                capture_output=True,
                text=True,
                check=True
            )

            version_str = result.stdout.strip()
            if 'Chrom' not in version_str:
                print(
                    'Error: Executable output unexpected version string: '
                    f'{version_str}'
                )
                sys.exit(1)

            full_version = version_str.split()[-1]

        except subprocess.CalledProcessError as e:
            print(f"Error executing '{chrome_executable} --version': {e}")
            sys.exit(1)

    if not full_version or full_version.count('.') < 3:
        print(f'Error: Extracted Chrome version "{full_version}" '
              f'seems invalid.')
        sys.exit(1)

    return full_version


def get_system_and_platform():
    """Get the CfT platform name (e.g., mac-arm64, linux64)."""
    system = platform.system()

    if system == 'Darwin':
        if platform.machine() in ('arm64', 'aarch64'):
            return 'mac-arm64'
        return 'mac-x64'
    if system == 'Linux':
        return 'linux64'
    if system == 'Windows':
        return 'win64'

    print(f'Error: Unknown or unsupported operating system: {system}')
    sys.exit(1)


def get_chromedriver_download_url(full_chrome_version, cft_platform):
    """Get the required Chromedriver version and download URL using CfT."""
    download_url = (
        'https://storage.googleapis.com/chrome-for-testing-public/'
        f'{full_chrome_version}/{cft_platform}/'
        f'chromedriver-{cft_platform}.zip'
    )
    return full_chrome_version, download_url


def download_and_extract(url, target_directory, cft_platform):
    """Downloads the zip, extracts chromedriver, and sets permissions."""
    print(f'Downloading from: {url}')

    temp_zip_path = os.path.join(target_directory, 'chromedriver_temp.zip')
    try:
        response = requests.get(url, stream=True)
        response.raise_for_status()
        with open(temp_zip_path, 'wb') as f:
            for chunk in response.iter_content(chunk_size=8192):
                f.write(chunk)
    except Exception as e:
        print(f'Error during download: {e}')
        sys.exit(1)

    print('Extracting chromedriver...')

    chromedriver_in_zip_dir = f'chromedriver-{cft_platform}/'

    if cft_platform.startswith('win'):
        chromedriver_in_zip = chromedriver_in_zip_dir + 'chromedriver.exe'
        chromedriver_target_name = 'chromedriver.exe'
    else:
        chromedriver_in_zip = chromedriver_in_zip_dir + 'chromedriver'
        chromedriver_target_name = 'chromedriver'

    target_path = os.path.join(target_directory, chromedriver_target_name)
    found = False

    try:
        with zipfile.ZipFile(temp_zip_path, 'r') as z:
            for name in z.namelist():
                if name == chromedriver_in_zip:
                    with z.open(name) as source, open(
                        target_path, 'wb'
                    ) as target:
                        target.write(source.read())
                    found = True
                    break
    except Exception as e:
        print(f'Error during extraction: {e}')
        sys.exit(1)
    finally:
        os.remove(temp_zip_path)

    if not found:
        print(f"Error: '{chromedriver_in_zip}' not found in archive.")
        sys.exit(1)

    if not cft_platform.startswith('win'):
        print('Setting executable permissions.')
        os.chmod(
            target_path,
            stat.S_IRWXU |
            stat.S_IRGRP |
            stat.S_IXGRP |
            stat.S_IROTH |
            stat.S_IXOTH
        )

    print(f'\nSuccess! Chromedriver downloaded and saved to: {target_path}')


# --- Core Logic ---


def main():
    """The core structure of the app."""
    try:
        import requests  # noqa: F401
    except ImportError:
        print(
            "Error: The 'requests' library is required. "
            "Please install it with 'pip install requests'"
        )
        sys.exit(1)

    args = read_command_line()

    if not os.path.isdir(args.directory):
        print(
            f'Error: The specified output directory "{args.directory}" '
            'could not be accessed.'
        )
        sys.exit(1)

    cft_platform = get_system_and_platform()
    current_system = platform.system()
    print(f'Detected OS: {current_system} | '
          f'Target CfT Platform: {cft_platform}')

    full_chrome_version = get_chrome_version()
    print(f'Detected Chrome Version: {full_chrome_version}')

    chromedriver_version, download_url = get_chromedriver_download_url(
        full_chrome_version, cft_platform
    )
    print(f'Downloading chromedriver v{chromedriver_version}...')

    download_and_extract(download_url, args.directory, cft_platform)


if __name__ == '__main__':
    main()
