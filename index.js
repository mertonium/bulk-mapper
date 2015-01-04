// Modules
var fs = require('graceful-fs'),
    gm = require('gm'),
    _  = require('underscore'),
    async = require('async'),
    sha1 = require('sha1');

// Sub modules
var imageMagick = gm.subClass({ imageMagick: true }),
    ExifImage  = require('exif').ExifImage;

// Globals
var originalsPath = "/Users/mertonium/Pictures/zamar",
    exportsPath = "/Users/mertonium/Pictures/zamar/exports",
    s3Path = "https://s3.amazonaws.com/mertonium_public/zamar";
    records = [];

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
  this.exportUri = exportsPath + '/' + this.filename;
  this.s3Url = s3Path + '/' + this.filename.replace(' ', '+');

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
      _id: this._id,
      geometry: {
        type: "Point",
        coordinates: [this.longitude, this.latitude]
      },
      properties : {
        filename : this.filename,
        created_at : this.created_at,
        s3Url : this.s3Url
      }
    };
  };
}

var processFile = function(filename, cb) {
  var record = new ImageRecord(filename);
  records.push(record);

  console.log("processing " + record.originalUri);

  async.waterfall([
    function(cb) {
      new ExifImage({ image: record.originalUri }, cb);
    },
    function(data, cb) {
      record.addExifData(data);
      //console.log(record.asObject());
      console.log("exporting " + record.originalUri+ " to " + record.exportUri);

      // Create new image...
      //imageMagick(record.originalUri).resize(800, 800).noProfile().write(record.exportUri, cb);
      cb();
    },
    function(cb) {
      // call to couchdb
      console.log(record.asDocument());
    }
  ], cb);
};

async.eachLimit(originals, 5, processFile, function(err) {
  if(err) console.error(err.message);
});

