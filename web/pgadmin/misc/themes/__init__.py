import os
import json
from pgadmin.utils.preferences import Preferences


def get_all_themes():
    # Themes file is copied in generated directory
    theme_file_path = os.path.join(
        os.path.dirname(os.path.realpath(__file__)),
        '../../static/js/generated',
        'pgadmin.themes.json'
    )

    all_themes = {
        "standard": {
            "disp_name": "Standard",
            "cssfile": "pgadmin",
            "preview_img": "standard_preview.png"
        }
    }

    try:
        all_themes.update(json.load(open(theme_file_path)))
    except Exception:
        pass

    return all_themes


def themes(app):
    @app.context_processor
    def inject_theme_func():
        def get_theme_css():
            all_themes = get_all_themes()
            theme_css = all_themes['standard']['cssfile'] + '.css'
            theme = 'standard'
            try:
                misc_preference = Preferences.module('misc')
                theme = misc_preference.preference('theme').get()
                if theme in all_themes:
                    theme_css = all_themes[theme]['cssfile'] + '.css'
            except Exception:
                # Let the default theme go if exception occurs
                pass

            return theme_css, theme

        return {
            'get_theme_css': get_theme_css,
        }
