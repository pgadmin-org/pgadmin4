import os
import json
from pgadmin.utils.preferences import Preferences


def get_all_themes():
    all_themes = {
        "light": {
            "disp_name": "Light",
            "preview_img": "light_preview.png"
        },
        "dark": {
            "disp_name": "dark",
            "preview_img": "dark_preview.png"
        },
        "high_contrast": {
            "disp_name": "high_contrast",
            "preview_img": "high_contrast_preview.png"
        },
        "system": {
            "disp_name": "system"
        },
    }
    return all_themes
