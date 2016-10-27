var sha1 = require('sha1');

// Class for the [poorly named] image records.
function ImageRecord(filename, originalsPath, exportsPath, s3Path) {
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

module.exports = ImageRecord;
