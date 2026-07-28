/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////
import { CRS } from 'leaflet';
import DOMPurify from 'dompurify';
import gettext from 'sources/gettext';

const DEFAULT_MAX_ZOOM = 18;
const OSM_ATTRIBUTION = '&copy; <a href="http://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a>';
const CARTODB_ATTRIBUTION = OSM_ATTRIBUTION
  + ', &copy; <a href="http://cartodb.com/attributions" target="_blank">CartoDB</a>';

// Builds the custom tile provider config from the sqleditor module
// preferences, or null when the URL preference is blank (feature disabled).
// A non-blank but unusable URL yields {invalid: true} so the caller can
// surface a message and fall back to the default layers.
export function getCustomTileProvider(prefs) {
  const url = (prefs?.custom_tile_url ?? '').trim();
  if (!url) {
    return null;
  }
  if (!/^https?:\/\//.test(url) || !url.includes('{x}')
      || !url.includes('{y}') || !url.includes('{z}')) {
    return { invalid: true };
  }
  const crs = prefs.custom_tile_crs || 'EPSG:3857';
  return {
    url: url,
    name: DOMPurify.sanitize((prefs.custom_tile_name ?? '').trim() || gettext('Custom')),
    crs: crs,
    attribution: DOMPurify.sanitize(prefs.custom_tile_attribution || ''),
    maxZoom: prefs.custom_tile_max_zoom ?? DEFAULT_MAX_ZOOM,
    isDefaultCrs: crs === 'EPSG:3857',
  };
}

// Returns the Leaflet CRS the map must be created with. Tiles (and thus the
// custom provider) only apply to SRID 4326 data; anything else renders on a
// blank Cartesian plane as before. The provider CRS string is resolved
// dynamically against Leaflet's CRS namespace ('EPSG:4326' -> CRS.EPSG4326),
// falling back to Web Mercator for unknown codes.
export function getMapCrs(selectedSRID, provider) {
  if (selectedSRID !== 4326) {
    return CRS.Simple;
  }
  if (!provider || provider.invalid) {
    return CRS.EPSG3857;
  }
  const crs = CRS[provider.crs.replace(':', '')];
  return crs?.code ? crs : CRS.EPSG3857;
}

// Returns the base layer configs for the LayersControl. Built-in layers are
// all Web Mercator tiled, so they are only offered when no custom provider
// is set or the custom provider is Web Mercator too; a custom provider in
// any other CRS can only be combined with the empty layer.
export function getBaseLayers(provider) {
  const hasProvider = Boolean(provider) && !provider.invalid;
  const layers = [{
    name: gettext('Empty'),
    url: '',
    checked: false,
  }];

  if (!hasProvider || provider.isDefaultCrs) {
    layers.push({
      name: gettext('Street'),
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      maxZoom: 19,
      attribution: OSM_ATTRIBUTION,
      checked: !hasProvider,
    }, {
      name: gettext('Topography'),
      url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
      maxZoom: 17,
      attribution: OSM_ATTRIBUTION
        + ', &copy; <a href="http://viewfinderpanoramas.org" target="_blank">SRTM</a>'
        + ', &copy; <a href="https://opentopomap.org" target="_blank">OpenTopoMap</a>',
      checked: false,
    }, {
      name: gettext('Gray Style'),
      url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}{r}.png',
      maxZoom: 19,
      attribution: CARTODB_ATTRIBUTION,
      subdomains: 'abcd',
      checked: false,
    }, {
      name: gettext('Light Color'),
      url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      maxZoom: 19,
      attribution: CARTODB_ATTRIBUTION,
      subdomains: 'abcd',
      checked: false,
    }, {
      name: gettext('Dark Matter'),
      url: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}{r}.png',
      maxZoom: 19,
      attribution: CARTODB_ATTRIBUTION,
      subdomains: 'abcd',
      checked: false,
    });
  }

  if (hasProvider) {
    layers.push({
      name: provider.name,
      url: provider.url,
      maxZoom: provider.maxZoom,
      attribution: provider.attribution,
      checked: true,
    });
  }

  return layers;
}
