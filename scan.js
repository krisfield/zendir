var fs = require('fs');
var path = require('path');
var mysql = require('mysql');

var conf = JSON.parse( fs.readFileSync("config.json") );

var errors = [];
var filepaths = [];

var scanDir = function ( dirpath ) {

	try {
		var files = fs.readdirSync( dirpath );

		for( var i=0; i<files.length; i++) {

			filepath = path.join( dirpath, files[i] );
			var isFile = fs.lstatSync(filepath).isFile();

			if ( isFile ) {
				filepaths.push( filepath );
			}
			else {
				scanDir( filepath );
			}
		}

		console.log( "SCANNING " + dirpath );

	} catch (err) {
		console.log( "SKIPPING " + dirpath + ": " + err );
	}

};


var statFile = function ( filepath ) {

	var percentComplete = ((nextFile / filepaths.length) * 100).toFixed(2);

	console.log( "(" + percentComplete + "%) RECORDING: " + filepath );

	fs.stat( filepath, function( err, stats ){
		if ( err ) {
			console.log(err);
			errors.push(err);
		}

		recordInDatabase( filepath, stats );
	});

};


var recordInDatabase = function ( filepath, stats ) {

	var fileInfo = path.parse( filepath );

	// trim leading period off extension, lowercase, normalize name
	var ext = fileInfo.ext.replace(/^\./, '').toLowerCase();
	if ( ext === "jpg" ) {
		ext = "jpeg";
	}

	var relativepath = filepath.slice( rootpath.length );

	var file  = {
		rootpath: rootpath,
		relativepath: relativepath,
		filename: fileInfo.base,
		ext: ext,
		bytes: stats.size
	};

	var connection = mysql.createConnection(conf);
	connection.connect();
	var query = connection.query('INSERT INTO files SET ?', file, function(err, result) {
		if (err) {
			console.log( err );
			errors.push( err );
		}
	});
	connection.end();

	nextFile++;
	if ( filepaths[nextFile] ) {
		statFile(filepaths[nextFile]);
	}
	else {
		console.log( "(100%) RECORDING COMPLETE" );
		process.exit();
	}
};


// first real argument must be a valid path
var rootpath = process.argv[2];
var nextFile = 0;
if ( fs.lstatSync( rootpath ).isDirectory() ) {
	scanDir( rootpath );
	statFile( filepaths[nextFile] );
}