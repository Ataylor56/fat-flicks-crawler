const Api = require("./api/api.js");
const fs = require("fs");
const path = require("path");
const { google } = require("googleapis");
const { sheetId, range } = require("./secret/googleSheetConfig.js");
const { init } = require("./api/firestoreApi.js");

async function getSpreadsheetValues() {
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
    spreadsheetId: sheetId,
    range: range,
  });
  return readData.data.values;
}
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
function savePhoto(photoBuffers) {
  photoBuffers.forEach((photoBuffer) => {
    // Save File to Local Directory
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
  });
}
init();
const imageDementions = [500, 1500, 2500, 3500];
const main = async () => {
  const spreadsheetSkus = await getSpreadsheetValues();
  const strippedSkus = formatSpreadsheetValues(spreadsheetSkus);
  imageDementions.forEach(async (width) => {
    let noImageResponse = await Api.FetchNoResponseImage({ width });
    noImageResponse = new Uint8Array(noImageResponse).toString();
    strippedSkus.forEach(async (sku) => {
      const photoBuffers = await Api.FetchImages({
        sku,
        width,
        noImageResponse,
      });
      savePhoto(photoBuffers);
      console.log(
        console.log(`Saved Sku[ ${sku} ]: ${photoBuffers.length} images\n`)
      );
    });
    console.log(`Finished ${width}x${width} images\n`);
  });
  console.log(`Finished all images\n`);
};

main();
