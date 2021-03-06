const sha1 = require('sha1');

function convertGPSToDecimal(gpsArr, gpsRef) {
  if (!gpsArr || gpsArr.length !== 3) { return null; }

  const decimalPiece = ((gpsArr[1] * 60) + gpsArr[2]) / 3600;
  const baseResult = gpsArr[0] + decimalPiece;

  if (gpsRef === 'S' || gpsRef === 'W') {
    return (-1 * baseResult);
  }

  return baseResult;
}

function cleanFilename(filename) {
  return filename.replace(' ', '_');
}

// Class for the [poorly named] image records.
function ImageRecord(filename, originalsPath, exportsPath, s3Path) {
  this.filename = filename;
  this.id = sha1(this.filename);

  this.originalUri = `${originalsPath}/${this.filename}`;
  this.exportUri = `${exportsPath}/${cleanFilename(this.filename)}`;
  this.s3Url = `${s3Path}/${cleanFilename(this.filename)}`;

  this.addExifData = function addExifData(exifData) {
    this.created_at = exifData.exif.CreateDate;
    this.latitude = convertGPSToDecimal(exifData.gps.GPSLatitude, exifData.gps.GPSLatitudeRef);
    this.longitude = convertGPSToDecimal(exifData.gps.GPSLongitude, exifData.gps.GPSLongitudeRef);
  };

  this.asObject = function asObject() {
    return {
      filename: this.filename,
      created_at: this.created_at,
      latitude: this.latitude,
      longitude: this.longitude,
    };
  };

  this.asGeoJson = function asGeoJson() {
    return {
      id: this.id,
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [this.longitude, this.latitude],
      },
      properties: {
        title: '',
        filename: this.filename,
        created_at: this.created_at,
        photo_url: this.s3Url,
      },
    };
  };
}

module.exports = ImageRecord;
