#!/usr/bin/env node
const fs = require('graceful-fs');
const gm = require('gm');
const _ = require('lodash');
const async = require('async');
const ImageRecord = require('./lib/image_record');
const imageMagick = gm.subClass({ imageMagick: true });
const ExifImage = require('exif').ExifImage;

// Globals
const originalsPath = '/Users/mertonium/Pictures/test';
const exportsPath = '/Users/mertonium/Pictures/test/exports';
const s3Path = 'https://s3.amazonaws.com/mertonium_public/zamar';
const records = [];

// Read in all the files in the given folder, fliter out the non-images
const originalsArr = fs.readdirSync(originalsPath);
const originals = _.filter(originalsArr, x => (x.search(/\.jpg$/i) > -1));

function processFile(filename, done) {
  const record = new ImageRecord(filename, originalsPath, exportsPath, s3Path);

  async.waterfall([
    (cb) => {
      /* eslint no-new: "off" */
      new ExifImage({ image: record.originalUri }, cb);
    },
    (data, cb) => {
      record.addExifData(data);

      if (record.longitude != null && record.latitude != null) {
        records.push(record);
        imageMagick(record.originalUri).resize(400, 400).noProfile().write(record.exportUri, cb);
      } else {
        cb();
      }
    },
  ], done);
}

// Process the original images, 5 at a time, building the final geojson object
async.eachLimit(originals, 5, processFile, (err) => {
  if (err) console.error(err.message);

  const geojson = {
    type: 'FeatureCollection',
    features: _.map(records, r => r.asGeoJson()),
  };

  console.log(JSON.stringify(geojson, null, 2));
  console.log(`Processed ${geojson.features.length} records`);
});
