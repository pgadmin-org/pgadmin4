import os
import json
from pgadmin.utils.preferences import Preferences


def get_all_themes():
    # Themes file is copied in generated directory
    # theme_file_path = os.path.join(
    #     os.path.dirname(os.path.realpath(__file__)),
    #     '../../static/js/generated',
    #     'pgadmin.themes.json'
    # )

    all_themes = {
        "standard": {
            "disp_name": "Standard",
            "cssfile": "pgadmin",
            "preview_img": "standard_preview.png"
        },
        "dark": {
            "disp_name": "dark",
            "cssfile": "pgadmin.theme.dark",
            "preview_img": "dark_preview.png"
        },
        "high_contrast": {
            "disp_name": "high_contrast",
            "cssfile": "pgadmin.theme.high_contrast",
            "preview_img": "high_contrast_preview.png"
        },
    }

    return all_themes
