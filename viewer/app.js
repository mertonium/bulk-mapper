 var couchapp = require('couchapp')
  , path = require('path')
  ;

ddoc =
  { _id:'_design/app'
  , rewrites :
    [ {from:"/", to:'index.html'}
    , {from:"/api", to:'../../'}
    , {from:"/api/*", to:'../../*'}
    , {from:"/*", to:'*'}
    ]
  }
  ;

ddoc.views = {
  all: {
    map: function(doc) {
      if (doc.geometry && doc.geometry.coordinates[0]) {
        emit(doc.geometry, doc.properties);
      }
    }
  }
};

ddoc.lists = {
  geojson: function(head, req) {
    var row, out, sep = '\n';

    if (req.headers.Accept.indexOf('application/json')!=-1) {
      start({"headers":{"Content-Type" : "application/json"}});
    } else {
      start({"headers":{"Content-Type" : "text/plain"}});
    }

    if ('callback' in req.query) {
      send(req.query['callback'] + "(");
    }

    send('{"type": "FeatureCollection", "features":[');

    while (row = getRow()) {
      out = JSON.stringify({type: "Feature", geometry: row.key, properties: row.value});
      send(sep + out);
      sep = ',\n';
    }

    send("]}");

    if ('callback' in req.query) {
      send(")");
    }
  }
};

ddoc.validate_doc_update = function (newDoc, oldDoc, userCtx) {
  if (newDoc._deleted === true && userCtx.roles.indexOf('_admin') === -1) {
    throw "Only admin can delete documents on this database.";
  }
}

couchapp.loadAttachments(ddoc, path.join(__dirname, 'attachments'));

module.exports = ddoc;
