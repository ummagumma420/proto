function saveUser(db, name, password, phone, jwt, callback){
  db.collection('users').insertOne({name:name, password:password, phone:phone, jwt:jwt}, function(err, results) {
        if (err) {
            console.log(err);
        } else {
            callback(results);
        }
    });
}


function saveMech(db, name, password, phone, jwt, callback){
  db.collection('mech').insertOne({name:name, password:password, phone:phone, jwt:jwt}, function(err, results) {
        if (err) {
            console.log(err);
        } else {
            callback(results);
        }
    });
}


function saveCarRequest(db, requestId, username, phone, location, callback){
  db.collection('requestCar').insertOne({"_id": requestId, username:username, phone:phone, location:location}, function(err, results) {
        if (err) {
            console.log(err);
        } else {
            callback(results);
        }
    });
}


function fetchNearestMech(db, location, callback){
  db.collection('mech').find({
    location: {
             $geoNear: {
                     type: "Point",
                     coordinates: location
             } , $maxDistance: 7000
         }
     }).toArray(function(err, results) {
            if (err) {
                console.log('no mechanics at the moment or error in fetching',err);
            } else {
                callback(results);
            }
        });
}


function saveBikeRequest(db, requestId, username, phone, location, callback){
  db.collection('requestBike').insertOne({"_id": requestId, username:username, phone:phone, location:location}, function(err, results) {
        if (err) {
            console.log(err);
        } else {
            callback(results);
        }
    });
}


function requestUpdate(db, requestid, status, mechanicId, callback){
  db.collection("requestBike").update({
     _id: requestid
 }, {
     $set: {
         status: status,
         mechanicId: mechanicId
     }
 }, function(err, results) {
       if (err) {
           console.log(err);
       } else {
           callback(results);
       }
   });
}


function mechUpdate(db, phone, status, requestid, callback){
  db.collection("mech").update({
     phone: phone
 }, {
     $set: {
         status: status,
         requestId: requestid
     }
 }, function(err, results) {
       if (err) {
           console.log(err);
       } else {
           callback(results);
       }
   });
}


exports.saveUser = saveUser;
exports.saveMech = saveMech;
exports.saveCarRequest = saveCarRequest;
exports.saveBikeRequest = saveBikeRequest;
exports.fetchNearestMech = fetchNearestMech;
exports.requestUpdate = requestUpdate;
exports.mechUpdate = mechUpdate;
