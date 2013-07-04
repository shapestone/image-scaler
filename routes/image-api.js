var fs = require('fs');
var gm = require('gm');

var urlBase = "/images";

var mimeEncodings = {
  'jpg':'image/jpeg',
  'gif':'image/gif',
  'png':'image/png',
  'svg':'image/svg+xml',
  'tif':'image/tiff',
  'tiff':'image/tiff',
  'pjpeg':'image/pjpeg'
};

var extractFromUrlPath = function(filePath) {
  var obj = {};

  // string base url path
  filePath = filePath.substring(urlBase.length);

  // extract parts
  var filename;
  obj.path = "";
  if(filePath.lastIndexOf('/') != -1) {
    // extract path and filename
    obj.path = filePath.substring(0, filePath.lastIndexOf('/'));
    obj.filename = filePath.substring(filePath.lastIndexOf('/') + 1);
    // strip query parameters
    if(obj.filename.lastIndexOf('?') != -1) {
      obj.filename = obj.filename.substring(0, obj.filename.lastIndexOf('?'));
    }
  } else {
    // extract filename
    obj.filename = filePath;
  }

  obj.filenameBase = "";
  obj.filenameExt = "";
  if(obj.filename.lastIndexOf('.') != -1) {
    obj.filenameBase = obj.filename.substring(0, obj.filename.lastIndexOf('.'));
    obj.filenameExt = obj.filename.substring(obj.filename.lastIndexOf('.') + 1);
  }

  return obj;
};

var createFilePath = function(filePath, urlParts, w, h) {
  var newFilePath = "";
  w = (w === null)? '?' : w;
  h = (h === null)? '?' : h;
  newFilePath += filePath + urlParts.path + '/';
  newFilePath += urlParts.filenameBase + '-' + w + 'x' + h + '.' + urlParts.filenameExt;
  return newFilePath;
};

/*
 * Image API
 */
exports.getImage = function (req, res) {
  var w = null;
  var h = null;
  if(req.query && req.query.w) {
    w = req.query.w;
  }
  if(req.query && req.query.h) {
    h = req.query.h;
  }

  var urlParts = extractFromUrlPath(req.originalUrl);
  var origFilePath = 'data' + '/' + urlParts.filename;
  var mime = mimeEncodings[urlParts.filenameExt.toLowerCase()];

  if(w === null && h === null) {
    fs.readFile(origFilePath, function (error, file) {
      var imageData = new Buffer(file);
      res.writeHead(200, {'content-type': mime});
      res.write(imageData);
      res.end();
    });
    return;
  }

  var cacheFilePath = createFilePath('cache', urlParts, w, h);
  fs.stat(cacheFilePath, function(err, stats) {
    if(stats && stats.isFile()) {
      // file exist
      res.writeHead(200, {'content-type': mime, 'Content-Length': stats.size});
      var stream = fs.createReadStream(cacheFilePath, {
        'bufferSize': 10000 * 1024
      }).pipe(res);

      stream.on('end', function() {
        res.end();
      });

      stream.on('error', function(err) {
        console.log(err);
        // todo: send HTTP status
        res.end();
      });
    } else {
      // new file needed
      gm(origFilePath)
        .resize(w, h)
        .write(cacheFilePath, function (err) {
          if (!err) {
            fs.stat(cacheFilePath, function(err, stats) {
              res.writeHead(200, {'Content-Type': mime, 'Content-Length': stats.size});
              var stream = fs.createReadStream(cacheFilePath, {
                'bufferSize': 10000 * 1024
              }).pipe(res);

              stream.on('end', function() {
                res.end();
              });

              stream.on('error', function(err) {
                console.log(err);
                // todo: send HTTP status
                res.end();
              });
            });
          } else {
            console.log("error: " + err);
            res.end();
          }
        }
      );
    }
  });
};