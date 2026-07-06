/////////////////////////////////////////////////////////////
//
// pgAdmin 4 - PostgreSQL Tools
//
// Copyright (C) 2013 - 2026, The pgAdmin Development Team
// This software is released under the PostgreSQL Licence
//
//////////////////////////////////////////////////////////////

import { CRS } from 'leaflet';
import {
  getCustomTileProvider, getMapCrs, getBaseLayers,
} from '../../../pgadmin/tools/sqleditor/static/js/components/sections/GeometryViewerUtils';

const VALID_URL = 'https://tiles.example.com/{z}/{x}/{y}.png';

describe('GeometryViewerUtils', ()=>{

  describe('getCustomTileProvider', ()=>{
    it('returns null when no preferences or blank URL', ()=>{
      expect(getCustomTileProvider(undefined)).toBeNull();
      expect(getCustomTileProvider({})).toBeNull();
      expect(getCustomTileProvider({custom_tile_url: ''})).toBeNull();
      expect(getCustomTileProvider({custom_tile_url: '   '})).toBeNull();
    });

    it('flags URLs that are not usable tile templates as invalid', ()=>{
      expect(getCustomTileProvider({custom_tile_url: 'ftp://x/{z}/{x}/{y}'}))
        .toEqual({invalid: true});
      expect(getCustomTileProvider({custom_tile_url: 'tiles/{z}/{x}/{y}'}))
        .toEqual({invalid: true});
      expect(getCustomTileProvider({custom_tile_url: 'https://x.com/{x}/{y}'}))
        .toEqual({invalid: true});
      expect(getCustomTileProvider({custom_tile_url: 'https://x.com/{z}/{x}'}))
        .toEqual({invalid: true});
    });

    it('applies defaults for missing optional preferences', ()=>{
      const provider = getCustomTileProvider({custom_tile_url: VALID_URL});
      expect(provider).toEqual({
        url: VALID_URL,
        name: 'Custom',
        crs: 'EPSG:3857',
        attribution: '',
        maxZoom: 18,
        isDefaultCrs: true,
      });
    });

    it('uses the configured values when present', ()=>{
      const provider = getCustomTileProvider({
        custom_tile_url: VALID_URL,
        custom_tile_name: 'My Tiles',
        custom_tile_crs: 'EPSG:4326',
        custom_tile_attribution: '&copy; <a href="https://example.com">Example</a>',
        custom_tile_max_zoom: 12,
      });
      expect(provider.name).toBe('My Tiles');
      expect(provider.crs).toBe('EPSG:4326');
      expect(provider.maxZoom).toBe(12);
      expect(provider.isDefaultCrs).toBe(false);
      expect(provider.attribution).toContain('Example');
    });

    it('sanitizes script content out of the attribution', ()=>{
      const provider = getCustomTileProvider({
        custom_tile_url: VALID_URL,
        custom_tile_attribution: 'safe<script>alert(1)</script>',
      });
      expect(provider.attribution).toBe('safe');
    });

    it('sanitizes script content out of the custom tile name', ()=>{
      const provider = getCustomTileProvider({
        custom_tile_url: VALID_URL,
        custom_tile_name: 'safe<script>alert(1)</script>',
      });
      expect(provider.name).toBe('safe');
    });
  });

  describe('getMapCrs', ()=>{
    it('always uses CRS.Simple for non-4326 data', ()=>{
      expect(getMapCrs(0, null)).toBe(CRS.Simple);
      expect(getMapCrs(3857, getCustomTileProvider({custom_tile_url: VALID_URL})))
        .toBe(CRS.Simple);
    });

    it('defaults to Web Mercator without a usable provider', ()=>{
      expect(getMapCrs(4326, null)).toBe(CRS.EPSG3857);
      expect(getMapCrs(4326, {invalid: true})).toBe(CRS.EPSG3857);
    });

    it('resolves the provider CRS dynamically from leaflet', ()=>{
      expect(getMapCrs(4326, {crs: 'EPSG:3857'})).toBe(CRS.EPSG3857);
      expect(getMapCrs(4326, {crs: 'EPSG:4326'})).toBe(CRS.EPSG4326);
      expect(getMapCrs(4326, {crs: 'EPSG:3395'})).toBe(CRS.EPSG3395);
    });

    it('falls back to Web Mercator for unknown CRS codes', ()=>{
      expect(getMapCrs(4326, {crs: 'EPSG:9999'})).toBe(CRS.EPSG3857);
      // CRS.Simple exists in leaflet but has no code - not a tile CRS
      expect(getMapCrs(4326, {crs: 'Simple'})).toBe(CRS.EPSG3857);
    });
  });

  describe('getBaseLayers', ()=>{
    it('returns the built-in layers with Street checked when no provider', ()=>{
      const layers = getBaseLayers(null);
      expect(layers.map((l)=>l.name)).toEqual([
        'Empty', 'Street', 'Topography', 'Gray Style', 'Light Color',
        'Dark Matter',
      ]);
      expect(layers.filter((l)=>l.checked).map((l)=>l.name)).toEqual(['Street']);
    });

    it('treats an invalid provider like no provider', ()=>{
      expect(getBaseLayers({invalid: true})).toEqual(getBaseLayers(null));
    });

    it('appends a Web Mercator provider to the built-in layers, checked', ()=>{
      const layers = getBaseLayers(getCustomTileProvider({
        custom_tile_url: VALID_URL,
        custom_tile_name: 'My Tiles',
      }));
      expect(layers.length).toBe(7);
      expect(layers[6].name).toBe('My Tiles');
      expect(layers[6].url).toBe(VALID_URL);
      expect(layers.filter((l)=>l.checked).map((l)=>l.name)).toEqual(['My Tiles']);
    });

    it('offers only Empty and the provider for non-mercator CRS', ()=>{
      const layers = getBaseLayers(getCustomTileProvider({
        custom_tile_url: VALID_URL,
        custom_tile_crs: 'EPSG:4326',
      }));
      expect(layers.map((l)=>l.name)).toEqual(['Empty', 'Custom']);
      expect(layers.filter((l)=>l.checked).map((l)=>l.name)).toEqual(['Custom']);
    });
  });
});
