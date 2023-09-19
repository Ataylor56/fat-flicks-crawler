const firebase = require("firebase-admin");
const serviceAccount = require("../secret/keys.json");

let db;
exports.init = function init() {
  firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
  });

  db = firebase.firestore();
};
