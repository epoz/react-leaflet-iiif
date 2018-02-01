"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; /*
                                                                                                                                                                                                                                                                               * Leaflet-IIIF forked from https://github.com/mejackreed/Leaflet-IIIF
                                                                                                                                                                                                                                                                               * original by Jack Reed, @mejackreed
                                                                                                                                                                                                                                                                               * Removed the JQuery dependency
                                                                                                                                                                                                                                                                               */


var _reactLeaflet = require("react-leaflet");

var _leaflet = require("leaflet");

var _leaflet2 = _interopRequireDefault(_leaflet);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

_leaflet2.default.TileLayer.Iiif = _leaflet2.default.TileLayer.extend({
  options: {
    continuousWorld: true,
    tileSize: 256,
    updateWhenIdle: true,
    tileFormat: "jpg",
    fitBounds: true,
    setMaxBounds: false,
    maxZoom: 20
  },

  initialize: function initialize(url, options) {
    options = typeof options !== "undefined" ? options : {};

    if (options.maxZoom) {
      this._customMaxZoom = true;
    }

    // Check for explicit tileSize set
    if (options.tileSize) {
      this._explicitTileSize = true;
    }

    // Check for an explicit quality
    if (options.quality) {
      this._explicitQuality = true;
    }

    options = _leaflet2.default.setOptions(this, options);
    this._infoUrl = url;
    this._baseUrl = this._templateUrl();

    this._infoPromise = fetch(this._infoUrl);
  },
  getTileUrl: function getTileUrl(coords) {
    var _this = this,
        x = coords.x,
        y = coords.y,
        zoom = _this._getZoomForUrl(),
        scale = Math.pow(2, _this.maxNativeZoom - zoom),
        tileBaseSize = _this.options.tileSize * scale,
        minx = x * tileBaseSize,
        miny = y * tileBaseSize,
        maxx = Math.min(minx + tileBaseSize, _this.x),
        maxy = Math.min(miny + tileBaseSize, _this.y);

    var xDiff = maxx - minx;
    var yDiff = maxy - miny;

    return _leaflet2.default.Util.template(this._baseUrl, _leaflet2.default.extend({
      format: _this.options.tileFormat,
      quality: _this.quality,
      region: [minx, miny, xDiff, yDiff].join(","),
      rotation: 0,
      size: Math.ceil(xDiff / scale) + ","
    }, this.options));
  },
  onAdd: function onAdd(map) {
    var _this = this;

    // Wait for _this._infoPromise fetch to complete
    _this._infoPromise.then(function (response) {
      return response.json();
    }).then(function (data) {
      _this.y = data.height;
      _this.x = data.width;

      var tierSizes = [],
          imageSizes = [],
          scale,
          width_,
          height_,
          tilesX_,
          tilesY_;

      // Set quality based off of IIIF version
      if (data.profile instanceof Array) {
        _this.profile = data.profile[0];
      } else {
        _this.profile = data.profile;
      }

      _this._setQuality();

      // Unless an explicit tileSize is set, use a preferred tileSize
      if (!_this._explicitTileSize) {
        // Set the default first
        _this.options.tileSize = 256;
        if (data.tiles) {
          // Image API 2.0 Case
          _this.options.tileSize = data.tiles[0].width;
        } else if (data.tile_width) {
          // Image API 1.1 Case
          _this.options.tileSize = data.tile_width;
        }
      }

      function ceilLog2(x) {
        return Math.ceil(Math.log(x) / Math.LN2);
      }

      // Calculates maximum native zoom for the layer
      _this.maxNativeZoom = Math.max(ceilLog2(_this.x / _this.options.tileSize), ceilLog2(_this.y / _this.options.tileSize));

      // Enable zooming further than native if maxZoom option supplied
      if (_this._customMaxZoom && _this.options.maxZoom > _this.maxNativeZoom) {
        _this.maxZoom = _this.options.maxZoom;
      } else {
        _this.maxZoom = _this.maxNativeZoom;
      }

      for (var i = 0; i <= _this.maxZoom; i++) {
        scale = Math.pow(2, _this.maxNativeZoom - i);
        width_ = Math.ceil(_this.x / scale);
        height_ = Math.ceil(_this.y / scale);
        tilesX_ = Math.ceil(width_ / _this.options.tileSize);
        tilesY_ = Math.ceil(height_ / _this.options.tileSize);
        tierSizes.push([tilesX_, tilesY_]);
        imageSizes.push(_leaflet2.default.point(width_, height_));
      }

      _this._tierSizes = tierSizes;
      _this._imageSizes = imageSizes;

      // Set maxZoom for map
      map._layersMaxZoom = _this.maxZoom;

      // Call add TileLayer
      _leaflet2.default.TileLayer.prototype.onAdd.call(_this, map);

      if (_this.options.fitBounds) {
        _this._fitBounds();
      }

      if (_this.options.setMaxBounds) {
        _this._setMaxBounds();
      }

      // Reset tile sizes to handle non 256x256 IIIF tiles
      _this.on("tileload", function (tile, url) {
        var height = tile.tile.naturalHeight,
            width = tile.tile.naturalWidth;

        // No need to resize if tile is 256 x 256
        if (height === 256 && width === 256) return;

        tile.tile.style.width = width + "px";
        tile.tile.style.height = height + "px";
      });
    });
  },
  onRemove: function onRemove(map) {
    var _this = this;

    // Remove maxBounds set for this image
    if (_this.options.setMaxBounds) {
      map.setMaxBounds(null);
    }

    // Call remove TileLayer
    _leaflet2.default.TileLayer.prototype.onRemove.call(_this, map);
  },
  _fitBounds: function _fitBounds() {
    var _this = this;

    // Find best zoom level and center map
    var initialZoom = _this._getInitialZoom(_this._map.getSize());
    var imageSize = _this._imageSizes[initialZoom];
    var sw = _this._map.options.crs.pointToLatLng(_leaflet2.default.point(0, imageSize.y), initialZoom);
    var ne = _this._map.options.crs.pointToLatLng(_leaflet2.default.point(imageSize.x, 0), initialZoom);
    var bounds = _leaflet2.default.latLngBounds(sw, ne);

    _this._map.fitBounds(bounds, true);
  },
  _setMaxBounds: function _setMaxBounds() {
    var _this = this;

    // Find best zoom level, center map, and constrain viewer
    var initialZoom = _this._getInitialZoom(_this._map.getSize());
    var imageSize = _this._imageSizes[initialZoom];
    var sw = _this._map.options.crs.pointToLatLng(_leaflet2.default.point(0, imageSize.y), initialZoom);
    var ne = _this._map.options.crs.pointToLatLng(_leaflet2.default.point(imageSize.x, 0), initialZoom);
    var bounds = _leaflet2.default.latLngBounds(sw, ne);

    _this._map.setMaxBounds(bounds, true);
  },

  _setQuality: function _setQuality() {
    var _this = this;
    var profileToCheck = _this.profile;

    if (_this._explicitQuality) {
      return;
    }

    // If profile is an object
    if ((typeof profileToCheck === "undefined" ? "undefined" : _typeof(profileToCheck)) === "object") {
      profileToCheck = profileToCheck["@id"];
    }

    // Set the quality based on the IIIF compliance level
    switch (true) {
      case /^http:\/\/library.stanford.edu\/iiif\/image-api\/1.1\/compliance.html.*$/.test(profileToCheck):
        _this.options.quality = "native";
        break;
      // Assume later profiles and set to default
      default:
        _this.options.quality = "default";
        break;
    }
  },

  _infoToBaseUrl: function _infoToBaseUrl() {
    return this._infoUrl.replace("info.json", "");
  },
  _templateUrl: function _templateUrl() {
    return this._infoToBaseUrl() + "{region}/{size}/{rotation}/{quality}.{format}";
  },
  _isValidTile: function _isValidTile(coords) {
    var _this = this,
        zoom = _this._getZoomForUrl(),
        sizes = _this._tierSizes[zoom],
        x = coords.x,
        y = coords.y;

    if (!sizes) return false;
    if (x < 0 || sizes[0] <= x || y < 0 || sizes[1] <= y) {
      return false;
    } else {
      return true;
    }
  },
  _getInitialZoom: function _getInitialZoom(mapSize) {
    var _this = this,
        tolerance = 0.8,
        imageSize;

    for (var i = _this.maxNativeZoom; i >= 0; i--) {
      imageSize = this._imageSizes[i];
      if (imageSize.x * tolerance < mapSize.x && imageSize.y * tolerance < mapSize.y) {
        return i;
      }
    }
    // return a default zoom
    return 2;
  }
});

_leaflet2.default.tileLayer.iiif = function (url, options) {
  return new _leaflet2.default.TileLayer.Iiif(url, options);
};

var IIIFTileLayer = function (_TileLayer) {
  _inherits(IIIFTileLayer, _TileLayer);

  function IIIFTileLayer() {
    _classCallCheck(this, IIIFTileLayer);

    return _possibleConstructorReturn(this, (IIIFTileLayer.__proto__ || Object.getPrototypeOf(IIIFTileLayer)).apply(this, arguments));
  }

  _createClass(IIIFTileLayer, [{
    key: "createLeafletElement",
    value: function createLeafletElement(props) {
      return new _leaflet2.default.TileLayer.Iiif(props.url, this.getOptions(props));
    }
  }, {
    key: "updateLeafletElement",
    value: function updateLeafletElement(fromProps, toProps) {
      /* We do not support updating IIIFTileLayer elements,
      remove this element from the map and create a new one...
      */
      return;
    }
  }]);

  return IIIFTileLayer;
}(_reactLeaflet.TileLayer);

exports.default = IIIFTileLayer;