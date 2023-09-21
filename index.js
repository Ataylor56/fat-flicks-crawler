require("dotenv").config();
const Api = require("./api/api.js");
const {
  firebaseInit,
  UploadImage,
  getSpreadsheetValues,
} = require("./api/firestoreApi.js");

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
  photoBuffers.forEach(async (photoBuffer) => {
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
    await UploadImage({
      sku: photoBuffer.sku,
      width: photoBuffer.width,
      angle: photoBuffer.angle,
      buffer: photoBuffer.buffer,
    });
  });
}
firebaseInit();
const imageDementions = [500, 1500, 2500, 3500];
const main = async () => {
  const skuArray = await getSpreadsheetValues();
  imageDementions.forEach(async (width) => {
    let noImageResponse = await Api.FetchNoResponseImage({ width });
    noImageResponse = new Uint8Array(noImageResponse).toString();
    skuArray.forEach(async (sku) => {
      const photoBuffers = await Api.FetchImages({
        sku,
        width,
        noImageResponse,
      });
      await savePhoto(photoBuffers);
      console.log(
        `Saved Sku[ ${sku}_${width}x${width} ]: ${photoBuffers.length} images\n`
      );
    });
  });
};

main();
