// Modules
var fs = require('graceful-fs'),
    gm = require('gm'),
    _  = require('underscore'),
    async = require('async'),
    sha1 = require('sha1'),
    cradle = require('cradle');

// Sub modules
var imageMagick = gm.subClass({ imageMagick: true }),
    ExifImage  = require('exif').ExifImage;

// Globals
var originalsPath = "/Users/mertonium/Pictures/zamar",
    exportsPath = "/Users/mertonium/Pictures/zamar/exports",
    s3Path = "https://s3.amazonaws.com/mertonium_public/zamar";
    records = [];

// Database
var db = new(cradle.Connection)('http://admin:admin@127.0.0.1', 5984, {
           cache: true,
           raw: false,
           forceSave: true
         }).database('zamar');


// Randos
var originalsArr = fs.readdirSync(originalsPath),
    originals = _.select(originalsArr, function(x) {
      return x.search(/\.jpg$/i) > -1;
    });

// Class for the [poorly named] image records.
function ImageRecord(filename) {
  this.filename = filename;
  this._id = sha1(this.filename);

  this.originalUri = originalsPath + '/' + this.filename;
  this.exportUri = exportsPath + '/' + this.filename.replace(' ', '_');
  this.s3Url = s3Path + '/' + this.filename.replace(' ', '_');

  this.addExifData = function(exifData) {
    var lat = exifData.gps.GPSLatitude,
        lng = exifData.gps.GPSLongitude,
        latRef = exifData.gps.GPSLatitudeRef,
        lngRef = exifData.gps.GPSLongitudeRef;

    this.created_at = exifData.exif.CreateDate;
    this.latitude = this.convertToDecimal(lat, latRef);
    this.longitude = this.convertToDecimal(lng, lngRef);
  };

  this.convertToDecimal = function(gpsArr, gpsRef) {
    var decimalPiece, baseResult;

    if(!gpsArr || gpsArr.length != 3) return;

    decimalPiece = (gpsArr[1] * 60 + gpsArr[2]) / 3600;
    baseResult = gpsArr[0] + decimalPiece;
    return (gpsRef == 'S' || gpsRef == 'W') ? -1 * baseResult : baseResult;
  };

  this.asObject = function() {
    return {
      filename : this.filename,
      created_at : this.created_at,
      latitude : this.latitude,
      longitude : this.longitude
    };
  };

  this.asDocument = function() {
    return {
      id: this._id,
      type: "Feature",
      geometry: {
        type: "Point",
        coordinates: [this.longitude, this.latitude]
      },
      properties : {
        title: '',
        filename : this.filename,
        created_at : this.created_at,
        photo_url : this.s3Url
      }
    };
  };

  this.asPublicArtFinder = function() {
    return {
      id: this._id,
      title: '',
      artist: 'zamar',
      description: '',
      discipline: '',
      location_description: '',
      full_address: '',
      geometry: {
        type: "Point",
        coordinates: [this.longitude, this.latitude]
      },
      image_urls: [this.s3Url],
      data_source: 'mertonium',
      doc_type: 'artwork',
      created_at : this.created_at
    };
  };
}

var processFile = function(filename, done) {
  var record = new ImageRecord(filename);

  async.waterfall([
    function(cb) {
      new ExifImage({ image: record.originalUri }, cb);
    },
    function(data, cb) {
      record.addExifData(data);

      if(record.longitude != null && record.latitude != null) {
        records.push(record);
        // Create new image...
        imageMagick(record.originalUri).resize(400, 400).noProfile().write(record.exportUri, cb);
      } else {
        cb();
      }
    }
  ], done);
};

async.eachLimit(originals, 5, processFile, function(err) {
  if(err) console.error(err.message);

  var featureCollection = _.map(records, function(r) { return r.asDocument(); });
  var geojson = {
    type: 'FeatureCollection',
    features: featureCollection
  };

  console.log(JSON.stringify(geojson, null, 2));
});
