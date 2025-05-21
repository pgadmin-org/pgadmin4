import gunicorn
import logging

gunicorn.SERVER_SOFTWARE = "Python"


def on_starting(worker):
    # Can be resolved because of how Dockerfile organizes the files
    import config

    if not config.JSON_LOGGER:
        return

    from jsonformatter import JsonFormatter

    json_formatter = JsonFormatter(config.CONSOLE_LOG_FORMAT_JSON)

    # Apply JSON formatter to root logs
    root_logger = logging.getLogger("root")
    for handler in root_logger.handlers:
        handler.setFormatter(json_formatter)

    # Apply JSON formatter to access logs
    access_logger = logging.getLogger("gunicorn.access")
    access_logger.setLevel(config.CONSOLE_LOG_LEVEL)
    for handler in access_logger.handlers:
        handler.setFormatter(json_formatter)

    # Apply JSON formatter to error logs
    error_logger = logging.getLogger("gunicorn.error")
    error_logger.setLevel(config.CONSOLE_LOG_LEVEL)
    for handler in error_logger.handlers:
        handler.setFormatter(json_formatter)
