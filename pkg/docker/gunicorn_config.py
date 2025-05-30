import gunicorn

# Can be resolved because of how Dockerfile organizes the code during build
from config import JSON_LOGGER, CONSOLE_LOG_LEVEL, CONSOLE_LOG_FORMAT_JSON

gunicorn.SERVER_SOFTWARE = "Python"

if JSON_LOGGER:
    logconfig_dict = {
        "version": 1,
        "disable_existing_loggers": False,
        "root": {"level": CONSOLE_LOG_LEVEL, "handlers": []},
        "loggers": {
            "gunicorn.error": {
                "level": CONSOLE_LOG_LEVEL,
                "handlers": ["error_console"],
                "propagate": True,
                "qualname": "gunicorn.error",
            },
            "gunicorn.access": {
                "level": CONSOLE_LOG_LEVEL,
                "handlers": ["console"],
                "propagate": True,
                "qualname": "gunicorn.access",
            },
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "formatter": "json",
                "stream": "ext://sys.stdout",
            },
            "error_console": {
                "class": "logging.StreamHandler",
                "formatter": "json",
                "stream": "ext://sys.stderr",
            },
        },
        "formatters": {
            "json": {
                "class": "jsonformatter.JsonFormatter",
                "format": CONSOLE_LOG_FORMAT_JSON,
            },
        },
    }
