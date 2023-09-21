const firebase = require("firebase-admin");
const { google } = require("googleapis");
const { getStorage } = require("firebase-admin/storage");
const serviceAccount = require("../secret/keys.json");
const { v4 } = require("uuid");

let db;
let bucket;
exports.firebaseInit = function firebaseInit() {
  firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
    storageBucket: process.env.STORAGE_BUCKET,
  });
  db = firebase.firestore();
  imagesDb = db.collection("images");
  db = imagesDb;
  bucket = getStorage().bucket();
};

exports.SaveImage = async function SaveImage({
  sku,
  width,
  angle,
  buffer,
  imageRef,
}) {
  const docRef = db.doc(v4()).set({
    sku,
    size: `${width}x${width}`,
    angle,
    imageRef,
  });
  await docRef.set({ buffer });
};

exports.UploadImage = async function UploadImage({
  sku,
  width,
  angle,
  buffer,
}) {
  const filename = `${sku}_${angle}.png`;
  const filepath = `${sku}/${width}x${width}/${filename}`;
  const file = bucket.file(filepath);
  await file.save(buffer, {
    resumable: false,
    metadata: {
      contentType: "image/png",
    },
  });
  const metadata = await file.getMetadata();
  const imageRef = metadata[0].mediaLink;
  const documentName = `${sku}_${width}x${width}_${angle}`;
  const docRef = await db.doc(documentName).set({
    sku,
    size: `${width}x${width}`,
    angle,
    imageRef,
  });
  return;
};

exports.getSpreadsheetValues = async function getSpreadsheetValues() {
  const auth = new google.auth.GoogleAuth({
    keyFile: "./secret/keys.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets",
  });
  const clientAuthObject = await auth.getClient();
  const googleSheetsInstance = google.sheets({
    version: "v4",
    auth: clientAuthObject,
  });
  const readData = await googleSheetsInstance.spreadsheets.values.get({
    spreadsheetId: process.env.SHEET_ID,
    range: process.env.RANGE,
  });
  return formatSpreadsheetValues(readData.data.values);
};

function formatSpreadsheetValues(spreadsheetSkus) {
  const strippedInput = [];
  spreadsheetSkus.forEach((sku, index) => {
    if (
      spreadsheetSkus[index][0]?.trim() !== undefined &&
      spreadsheetSkus[index][0]?.trim() !== null
    ) {
      strippedInput.push(spreadsheetSkus[index][0]);
    }
  });
  return strippedInput;
}
