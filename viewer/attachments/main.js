L.mapbox.accessToken = 'pk.eyJ1IjoibWVydG9uaXVtIiwiYSI6IjJuTUZHR00ifQ.nBruJqjjztQCczmnwQMuVg';
var theMap = L.mapbox.map('map', 'mertonium.km3la042')
  .setView([37.7474,-122.4392], 12);

var geojson = [
  {
    "_id": "f44a511635b2a4914544f2e79186d1732a4b85bf",
    "_rev": "1-a4ea627a71d801d51de7ca7a1a3a3969",
    "id": "f44a511635b2a4914544f2e79186d1732a4b85bf",
    "type": "Feature",
    "geometry": {
      "type": "Point",
      "coordinates": [-122.4015111111111, 37.79770277777778]
    },
    "properties": {
      "filename": "2014-07-06 16.11.45.jpg",
      "created_at": "2014:07:06 16:11:45",
      "s3Url": "https://s3.amazonaws.com/mertonium_public/zamar/2014-07-06+16.11.45.jpg"
    }
  }
];

var loadData = function(data, textStatus, xhr) {
  console.log(arguments);
  theMap.featureLayer.setGeoJSON(data);
};

$.getJSON('/zamar/_design/app/_list/geojson/all', loadData)

