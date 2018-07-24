var express = require('express');
var logger = require('../../lib/logger');
var server = module.exports = express();
var usermanager = require('../../lib/usermanager');
var configuration = require('../../lib/configuration');
var Constants = require('../../lib/outputmanager').Constants;
var configuration = require('../../lib/configuration');
var fs = require('fs');
var fse = require('fs-extra');
var path = require('path');
var OutputPlugin = require('../../lib/outputmanager').OutputPlugin;
var util = require('util');
var unzip = require('unzip');
var async = require('async');
var fstream = require('fstream')
var MongoClient = require('mongodb').MongoClient;
var objectId = require('mongodb').ObjectID;
var url = "mongodb://localhost:27017/";
var axios = require('axios');

// function DownloadOutput() {}

util.inherits(DownloadOutput, OutputPlugin);

server.get('/download/:tenant/:course', function (req, res, next) {
  var course = req.params.course;
  var tenant = req.params.tenant;
  var currentUser = usermanager.getCurrentUser();
  var mode = this.Constants.Modes.publish;

  if (currentUser && (currentUser.tenant._id === tenant)) {

    var outputplugin = app.outputmanager.getOutputPlugin(configuration.getConfig('outputPlugin'), function (error, plugin) {

      if (error) {
        logger.log('error', error);
        res.json({
          success: false,
          message: error.message
        });
        return res.end();
      } else {
        plugin.publish(course, mode, req, res, function (error, result) {
          if (error) {
            logger.log('error', 'Unable to publish');
            return res.json({
              success: false,
              message: error.message
            });
          }
          res.statusCode = 200;
          return res.json(result);
        });
      }

    });
  } else {
    // User doesn't have access to this course
    res.statusCode = 401;
    return res.json({
      success: false
    });
  }
});

server.get('/download/:tenant/:course/:title/download.zip', function (req, res, next) {
  var tenantId = req.params.tenant;
  var courseId = req.params.course;
  var FRAMEWORK_ROOT_FOLDER = path.join(configuration.tempDir, configuration.getConfig('masterTenantID'), Constants.Folders.Framework);
  var downloadZipFilename = path.join(FRAMEWORK_ROOT_FOLDER, Constants.Folders.AllCourses, tenantId, courseId, Constants.Filenames.Download);
  var zipName = req.params.title;
  var currentUser = usermanager.getCurrentUser();

  if (currentUser && (currentUser.tenant._id == tenantId)) {
    fs.stat(downloadZipFilename, function (err, stat) {
      if (err) {
        logger.log('error', 'Error calling fs.stat');
        logger.log('error', err);

        next(err);
      } else {
        res.writeHead(200, {
          'Content-Type': 'application/zip',
          'Content-Length': stat.size,
          'Content-disposition': 'attachment; filename=' + zipName + '.zip',
          'Pragma': 'no-cache',
          'Expires': '0'
        });
        var readStream = fs.createReadStream(downloadZipFilename);

        readStream.pipe(res);
      }
    });
  } else {
    // User does not have access to this download.
    res.statusCode = 401;
    return res.json({
      success: false
    });
  }
});



server.get('/download/:tenant/:course/:title/download', function (req, res, next) {
  var tenantId = req.params.tenant;
  var courseId = req.params.course;
  var courseName = '/' + req.params.title;
  var createdBy = req.user.email;
  var FRAMEWORK_ROOT_FOLDER = path.join(configuration.tempDir, configuration.getConfig('masterTenantID'), Constants.Folders.Framework);
  var downloadZipFilename = path.join(FRAMEWORK_ROOT_FOLDER, Constants.Folders.AllCourses, tenantId, courseId, Constants.Filenames.Download);
  var downloadBuildFilename = path.join(FRAMEWORK_ROOT_FOLDER, Constants.Folders.AllCourses, tenantId, courseId, Constants.Filenames.Build);
  var downloadNewFilename = path.join(FRAMEWORK_ROOT_FOLDER, Constants.Folders.AllCourses, tenantId, courseId, courseName);
  var currentUser = usermanager.getCurrentUser();


  if (currentUser && (currentUser.tenant._id == tenantId)) {
    fs.stat(downloadZipFilename, function (err, stat) {
      if (err) {
        logger.log('error', 'Error calling fs.stat');
        logger.log('error', err);

        next(err);
      } else {
        MongoClient.connect(url, function (err, db) {
          if (err) throw err;
          var dbo = db.db("adapt-tenant-master");
          dbo.collection("courses").findOne({
            _id: new objectId(req.params.course)
          }, (function (err, result) {
            if (err) throw err;
            var tagLength = result.tags.length;
            tagInit = 0;
            tagging = [];
            heroImageId = "";
           
            dbo.collection("assets").findOne({
                _id: new objectId(result.heroImage)
              }, (function (err, result) {
                if (err) throw err;
                if (result == null)
                  heroImageId = "";
                else heroImageId = courseName+result.path;
              })),
              result.tags.forEach(function (item) {
                dbo.collection("tags").findOne({
                  _id: new objectId(item)
                }, (function (err, result) {
                  if (err) throw err;
                  tagging.push(result.title);
                  tagInit++;
                  if (tagInit == tagLength) { 
                    var authOptions = {
                      method: 'POST',
                      url: '/api/course/add',
                      proxy: {
                        host: '192.168.245.89',
                        port: 8080
                    },
                      data: {
                        id: req.params.course,
                        title: req.params.title,
                        categories: tagging.toString(),
                        createdBy: createdBy,
                        image: heroImageId
                      },
                      headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                      },
                      json: true
                    };
                    axios(authOptions)
                      .catch(function (error) {
                        console.log(error);
                      });
                  }
                }));
              });
            db.close();
          }));
        });

        fse.copySync(downloadBuildFilename, downloadNewFilename);
        res.redirect('back');
      }
    });
  } else {
    // User does not have access to this download.
    res.statusCode = 401;
    return res.json({
      success: false
    });
  }
});
