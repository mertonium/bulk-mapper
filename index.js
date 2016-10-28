#!/usr/bin/env node
const fs = require('graceful-fs');
const gm = require('gm');
const _ = require('lodash');
const async = require('async');
const ImageRecord = require('./lib/image_record');
const ExifImage = require('exif').ExifImage;
const program = require('commander');

const imageMagick = gm.subClass({ imageMagick: true });

program
  .version('0.0.1')
  .usage('[options] <source path> <destination path>')
  .option('-p, --prefix [prefix]', 'Exported photo url prefix (i.e. https://s3.amazonaws.com/foo/bar)', '')
  .option('-f, --force', 'Force exported files to overwrite files with same name')
  .parse(process.argv);

if (program.args.length !== 2) {
  program.outputHelp();
  process.exit();
}

const prefix = program.prefix;
const originalsPath = program.args[0];
const exportsPath = program.args[1];
const records = [];

// Read in all the files in the given folder, fliter out the non-images
const originalsArr = fs.readdirSync(originalsPath);
const originals = _.filter(originalsArr, x => (x.search(/\.jpg$/i) > -1));

function processFile(filename, done) {
  const record = new ImageRecord(filename, originalsPath, exportsPath, prefix);

  async.waterfall([
    (cb) => {
      /* eslint no-new: "off" */
      new ExifImage({ image: record.originalUri }, cb);
    },
    (data, cb) => {
      record.addExifData(data);

      if (record.longitude != null && record.latitude != null) {
        records.push(record);
        if (program.force || !fs.existsSync(record.exportUri)) {
          imageMagick(record.originalUri)
            .resize(400, 400)
            .noProfile()
            .write(record.exportUri, cb);
        }
      }
      cb();
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
