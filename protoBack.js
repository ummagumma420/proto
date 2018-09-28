const MongoClient = require('mongodb').MongoClient;
const assert = require('assert');

// Connection URL
const url = 'mongodb://localhost:27017';

// Database Name
const dbName = 'predis';

// Use connect method to connect to the server
MongoClient.connect(url, function(err, client) {
  assert.equal(null, err);
  console.log("Connected successfully to server");

   db = client.db(dbName);

});

var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var notp = require('notp');
var jwt = require('jsonwebtoken');
var dbOperations = require('./dbOperations');

app.get('/user', function(req, res) {
   res.sendfile('userFront.html');
});
app.get('/mechanic', function(req, res) {
   res.sendfile('mechFront.html');
});

var users = [];
var userMap = {};
var usersBySocket = {};
var mech = [];
var mechMap = {}
var mechBySocket = {};
var requestMap = {};
io.on('connection', function(socket) {
   console.log('A user connected');
   socket.on('sendOTP', function(data) {
      console.log(data);


var key = data;
var token = notp.totp.gen(key,{time:120});
console.log('otp generated:',token);


      if(users.indexOf(data) > -1) {
         socket.emit('userExists', data + ' is registered! Try some other phone number.');
      } else {
         users.push(data);
         socket.emit('userSet', data);
      }
   });


   socket.on('verifyOtp', function(data){
     // Check TOTP is correct (HOTP if hotp pass type)
     var login = notp.totp.verify(data.otp, data.phone, {time:120});

     // invalid token if login is null
     if (!login) {
         return console.log('Token invalid');
     }

     // valid token
     console.log('Token valid, sync value is %s', login.delta);

     var jtoken = jwt.sign({id:data.name, key:data.phone},'741852963skr',{expiresIn:"7 days", issuer:"eagl"});
     console.log('jsonwebtoken created:',jtoken);

     dbOperations.saveUser(db, data.name, data.pass, data.phone, jtoken, function(results) {console.log(results);});
     console.log(data.name, ' is added to the users collection');

     userMap[data.phone] = socket.id;
     usersBySocket[socket.id] = data.phone;

     socket.emit('login',jtoken);
   });


   socket.on('authorize', function(data){
     var decoded = jwt.verify(data.jwt,'741852963skr');
     console.log('jtoken verified',decoded);
     socket.emit('serviceRequest');

   });


   socket.on('OTPsend', function(data) {
      console.log(data);

var key = data;
var token = notp.totp.gen(key,{time:120});
console.log('otp generated:',token);



      if(mech.indexOf(data) > -1) {
         socket.emit('mechExists', data + ' is registered! Try some other phone number.');
      } else {
         mech.push(data);
         socket.emit('mechSet', data);
      }
   });

   socket.on('otpVerify', function(data){
     // Check TOTP is correct (HOTP if hotp pass type)
     var login = notp.totp.verify(data.otp, data.phone,{time:120});

     // invalid token if login is null
     if (!login) {
         return console.log('Token invalid');
     }

     // valid token
     console.log('Token valid, sync value is %s', login.delta);

     var jtoken = jwt.sign({id:data.name, key:data.phone},'741852963skr',{expiresIn:"7 days", issuer:"eagl"});
     console.log('jsonwebtoken created:',jtoken);

     dbOperations.saveMech(db, data.name, data.pass, data.phone, jtoken, function(results) {console.log(results);});
     console.log(data.name, ' is added to the mech collection');

     mechMap[data.phone] = socket.id;
     mechBySocket[socket.id] = data.phone;

     socket.emit('logon',jtoken);
   });


   socket.on('disconnect', function() {
     if(usersBySocket[socket.id]){
        console.log('A user disconnected',usersBySocket[socket.id]);
        delete userMap[usersBySocket[socket.id]];         //remove user
        delete usersBySocket[socket.id];
      }   //remove socket
     else{
       console.log('A mechanic disconnected',mechBySocket[socket.id] );
       delete mechMap[mechBySocket[socket.id]];         //remove mechanic
       delete mechBySocket[socket.id];   //remove mechanic
      }
   });


   socket.on('approval', function(data){
     var decoded = jwt.verify(data.jwt,'741852963skr');
     console.log('jtoken verified',decoded);
     //socket.emit('CarServiceRequest');
   });

   socket.on('nearestCarMech', function(data){
     //console.log(data);
     var loc = data.location.map(Number);
     //console.log(loc);
     var decoded = jwt.verify(data.jwt,'741852963skr');

     var ObjectID = require('mongodb').ObjectID;
     var requestId = new ObjectID;

     //requestMap[requestId] = socket.id;

     dbOperations.saveCarRequest(db, requestId, decoded.id, decoded.key, loc, function(results){
       console.log(results);
     });

     dbOperations.fetchNearestMech(db, loc, function(results){
       console.log('fetched mech collection: ',results);
       socket.emit('mechListDisplay', results);
     });
     //socket.emit('repairRequest', result);
   });


   socket.on('nearestBikeMech', function(data){
     //console.log(data);
     var loc = data.location.map(Number);

     var decoded = jwt.verify(data.jwt,'741852963skr');

     var ObjectID = require('mongodb').ObjectID;
     var requestId = new ObjectID;

     //requestMap[requestId] = socket.id;

     dbOperations.saveBikeRequest(db, requestId, decoded.id, decoded.key, loc, function(results){
       console.log(results);
     });

     dbOperations.fetchNearestMech(db, loc, function(results){
       console.log('fetched mech collection: ',results);
       socket.emit('mechListDisplay', results);

       socket.to(mechMap[results[0].phone]).emit('repairRequest',requestId);

       setTimeout(function() {
                  if(requestMap[requestId]!=1){socket.to(mechMap[results[1].phone]).emit('repairRequest',requestId);}
                else{if(requestMap[requestId]!=1){socket.to(mechMap[results[2].phone]).emit('repairRequest',requestId);}
                      else{console.log('request wont be passed',requestMap[requestId]);}
                    }
               }, 20000);
     });
  });


   socket.on('accepted',function(data){
     console.log('request accepted of id: ', data);

     var ObjectID = require('mongodb').ObjectID;
     var requestid = new ObjectID(data);
     //console.log(requestid);
     requestMap[requestid] = 1;

     dbOperations.requestUpdate(db, requestid, 'engagaed', mechBySocket[socket.id], function(results){
       console.log(results);
     });
    console.log('request collection updated');

    dbOperations.mechUpdate(db, mechBySocket[socket.id], 'busy', requestid,  function(results){
      console.log(results);
    });
   console.log('mechanic status updated');

     socket.emit('intimate',mechBySocket[socket.id]);
   });

   socket.on('rejected',function(data){
     console.log('request rejected');
     //socket.emit();
   });

});



http.listen(3000, function() {
   console.log('listening on localhost:3000');
});
