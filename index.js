var express = require("express");
var app = express();

var mysql = require("mysql");
var connection = mysql.createConnection({
	host     : 'localhost',
  	user     : 'root',
  	password : 'root',
  	database : 'database1'
});

var bodyParser = require("body-parser");
app.use(bodyParser.json());

var bcrypt = require("bcrypt");

var jwt = require("jsonwebtoken");

connection.connect(function(err){
	if (!err) {
		console.log('connected');
	} else {
		console.log('Could\'nt connect to database');
		console.log(err);

	}
});


// SHOW SPECIFIC USER

app.get('/users/:id', function(req, res) {
	connection.query("SELECT * FROM user WHERE `id`=" + req.params.id, function(error, results, fields) {
		if (error) throw error;

		if (results[0] == null) {
			res.json({success:false, message:"User doesn't exist."});
		} else {
			authenticate(req, res, function(user) {
				console.log("Id in database: " + user.id + "    , Id in url: " + req.params.id);
				if (user.admin == true) {
					res.send(results);
				} else if (user.id == req.params.id) {
					res.send(results);
				} else {
					res.json({success: false, message: "You don't have permissions to view this user's profile"});
				}
			});
		}
	});
});



// SHOW ALL USERS

app.get('/users', function(req, res) {
	connection.query("SELECT * FROM user", function (error, results, fields) {
  		if (error) throw error;

  		authenticate(req, res, function(user) {
  			if (user.admin) {
  				res.json({success:true, data:results});
  			} else {
  				res.json({success:false, message:"You are not an admin."})
  			}
  		});
	});
});








// LOGIN & AUTHENTICATION BELOW

function authenticate(req, res, callback) {
	var token = req.body.token || req.query.token || req.headers['x-access-token'];

	if (token) {
		jwt.verify(token, "secretpassword", function(err, decoded) {
			if (err) {
				return res.json({success: false, message: "Please pass a valid token"});
			} else {
				var isAdmin = decoded.admin.data[0];

				var user = {
					id: decoded.id,
					username: decoded.username,
					admin: false
				}

				if (isAdmin == 1)
					user.admin = true;

				callback(user);
			}
		});
	} else {
		return res.status(403).send({
			success:false,
			message: 'No token provided.'
		});
	}
}

app.post('/login', function(req, res) {

	var username = req.body.username;
	var password = req.body.password;

	connection.query("SELECT * FROM user WHERE username='" + username + "'", function(error, results, fields) {
		if (!results.length) {
			var json = JSON.stringify({success: false, message: "Username and password combination is incorrect."});
			res.send(json);
		} else {
			var hashedPassword = results[0].password;

			bcrypt.compare(password, hashedPassword, function(err, doesMatch) {
				if (doesMatch) {
					var token = jwt.sign(results[0], "secretpassword", {
						expiresIn: "10m"
					});

					res.json({
						success: true,
						message: "Enjoy your token!",
						token: token
					});
				} else {
					var json = JSON.stringify({success: false, message: "Username and password combination is incorrect."});
					res.send(json);
				}
			});
		}
	});

});

app.post('/register', function(req, res) {

	var username = req.body.username;
	var password = req.body.password;

	connection.query("SELECT username FROM user WHERE username='" + req.body.username + "'", function(error, results, fields) {
		if (error) throw error;



		bcrypt.hash(password, 5, function(err, encryptedPassword) {
			
			if (!results.length) {
				registerUser(username, encryptedPassword, res);
			} else {
				var json = JSON.stringify({success: false, message: "Username already exists."});
				res.send(json);
			}
		});
	});
});

function registerUser(username, password, res) {
	connection.query("INSERT INTO user (username, password) VALUES ('" + username + "', '" + password + "')", function (error, results, fields) {
  		if (error) throw error;
  		
  		if (results!=null) {
  			if (results.affectedRows == 1) {
  				res.json({success: true, description: "Successfully created a new user."});
  			} else {
  				res.json({success: false, description: "Failed to create a new user."});
  			}
		}
	});
}

app.listen(3000,function() {
	console.log('Listening on port 3000!');
});