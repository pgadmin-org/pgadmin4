from .about import blueprint as AboutModule
from .authenticate import blueprint as AuthenticateModule
from .browser import blueprint as BrowserModule
from .dashboard import blueprint as DashboardModule
from .help import blueprint as HelpModule
from .misc import blueprint as MiscModule
from .preferences import blueprint as PreferencesModule
from .redirects import blueprint as RedirectModule
from .settings import blueprint as SettingsModule
from .tools import blueprint as ToolsModule


def get_submodules():
    return [
        AboutModule,
        AuthenticateModule,
        BrowserModule,
        DashboardModule,
        DashboardModule,
        HelpModule,
        MiscModule,
        PreferencesModule,
        RedirectModule,
        SettingsModule,
        ToolsModule
    ]
