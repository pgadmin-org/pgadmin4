// Get a setting from the server. Returns a string value
function getSetting(setting, defval) {
    var value
    $.ajaxSetup({
        async: false
    });

    $.post("{{ url_for('settings.get') }}", { setting: setting, default: defval })
        .done(function(data) {
            value = data
        }); 
        
    $.ajaxSetup({
        async: true
    });
    
    return value
}

// Get a setting from the server. Returns a boolean value
function getBooleanSetting(setting, defval) {
    return (getSetting(setting, defval) == "true" ? true : false)
}

// Get a setting from the server. Returns an integer value
function getIntegerSetting(setting, defval) {
    return parseInt(getSetting(setting, defval))
}

// Get a setting from the server. Returns an float value
function getFloatSetting(setting, defval) {
    return parseFloat(getSetting(setting, defval))
}

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

