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

async function UploadImage({ sku, width, angle, buffer }) {
  const filename = `${sku}_${angle}.png`;
  const filepath = `${sku}/${width}x${width}/${filename}`;
  const file = bucket.file(filepath);
  await file.save(buffer, {
    resumable: false,
    metadata: {
      contentType: "image/png",
    },
  });
  const imageRef = file.publicUrl();
  const documentName = `${sku}_${width}x${width}_${angle}`;
  const docRef = await db.doc(documentName).set({
    sku,
    size: `${width}x${width}`,
    angle,
    imageRef,
  });
  return imageRef;
}

exports.SavePhoto = async function SavePhoto(photoBuffers) {
  const refArray = [];
  for (const photoBuffer of photoBuffers) {
    /*
    // Save File to Local Images Directory
    const fs = require("fs");
    const path = require("path");
    const cwd = process.cwd();
    const imageDirectory = path.join(cwd, "images");
    if (!fs.existsSync(imageDirectory)) {
      fs.mkdirSync(imageDirectory);
    }
    const skuDirectoryName = path.join(imageDirectory, photoBuffer.sku);
    if (!fs.existsSync(skuDirectoryName)) {
      fs.mkdirSync(skuDirectoryName);
    }
    const resolutionDirectory = path.join(
      skuDirectoryName,
      `${photoBuffer.width}x${photoBuffer.width}`
    );
    if (!fs.existsSync(resolutionDirectory)) {
      fs.mkdirSync(resolutionDirectory);
    }
    const filename = `${photoBuffer.sku}_${photoBuffer.angle}.png`;
    const filepath = path.join(resolutionDirectory, filename);
    if (!fs.existsSync(filepath)) {
      fs.writeFileSync(filepath, photoBuffer.buffer);
    }
    */
    // Upload File to Firebase Storage & Save Document to Firestore
    const imageRef = await UploadImage({
      sku: photoBuffer.sku,
      width: photoBuffer.width,
      angle: photoBuffer.angle,
      buffer: photoBuffer.buffer,
    });
    refArray.push(imageRef);
  }
  return refArray;
};

exports.updateSpreadsheetValues = async function updateSpreadsheetValues({
  values,
  updateRange,
}) {
  const auth = new google.auth.GoogleAuth({
    keyFile: "./secret/keys.json",
    scopes: "https://www.googleapis.com/auth/spreadsheets",
  });
  const clientAuthObject = await auth.getClient();
  const googleSheetsInstance = google.sheets({
    version: "v4",
    auth: clientAuthObject,
  });
  await googleSheetsInstance.spreadsheets.values
    .clear({
      spreadsheetId: process.env.SHEET_ID,
      range: updateRange,
    })
    .then(async () => {
      await googleSheetsInstance.spreadsheets.values.update({
        spreadsheetId: process.env.SHEET_ID,
        range: updateRange,
        valueInputOption: "USER_ENTERED",
        resource: {
          values,
        },
      });
    });
};

exports.getSpreadsheetValues = async function getSpreadsheetValues(readRange) {
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
    range: readRange,
  });
  return readData.data.values;
};

exports.formatSpreadsheetValues = function formatSpreadsheetValues(
  spreadsheetSkus
) {
  const strippedInput = [];
  spreadsheetSkus.forEach((sku, index) => {
    if (
      spreadsheetSkus[index][0]?.trim() !== undefined &&
      spreadsheetSkus[index][0]?.trim() !== null
    ) {
      const skuArray = spreadsheetSkus[index];
      skuArray[0] = spreadsheetSkus[index][0].replace("-", "_");
      strippedInput.push(skuArray);
    }
  });
  return strippedInput;
};
