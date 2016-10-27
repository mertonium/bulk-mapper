#!/usr/bin/env node
// Modules
var fs = require('graceful-fs'),
    gm = require('gm'),
    _  = require('lodash'),
    async = require('async'),
    ImageRecord = require('./lib/image_record');

// Sub modules
var imageMagick = gm.subClass({ imageMagick: true }),
    ExifImage  = require('exif').ExifImage;

// Globals
var originalsPath = "/Users/mertonium/Pictures/test",
    exportsPath = "/Users/mertonium/Pictures/test/exports",
    s3Path = "https://s3.amazonaws.com/mertonium_public/zamar";
    records = [];

// Randos
var originalsArr = fs.readdirSync(originalsPath),
    originals = _.filter(originalsArr, function(x) {
      return x.search(/\.jpg$/i) > -1;
    });

var processFile = function(filename, done) {
  var record = new ImageRecord(filename, originalsPath, exportsPath, s3Path);

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
  console.log("Processed " + featureCollection.length + " records");
});
