// Store a single setting
function storeSetting(setting, value) {
    $.post("{{ url_for('settings.store') }}", { setting: setting, value: value });
}

// Store a number of settings.
// settings is a javascript object containing values for settingX and valueX,
// along with a count value which equals the number of setting/value pairs. 
// X is 1 based.
function storeSetting(settings) {
    $.post("{{ url_for('settings.store') }}", settings);
}

