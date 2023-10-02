require("dotenv").config();
const Api = require("./api/api.js");
const {
  firebaseInit,
  getSpreadsheetValues,
  updateSpreadsheetValues,
  formatSpreadsheetValues,
  SavePhoto,
} = require("./api/firestoreApi.js");
const WebhookClient = require("discord.js").WebhookClient;
const EmbededBuilder = require("discord.js").EmbedBuilder;
const nodeCron = require("node-cron");

firebaseInit();
const isDev = process.env.NODE_ENV === "development";
const webhookClient = new WebhookClient({
  url: isDev ? process.env.TEST_URL : process.env.SC_URL,
});
const imageDementions = [1500, 2500, 3500, 500];

const main = async () => {
  const skuArray = await getSpreadsheetValues(process.env.NEW_SKU_RANGE).then(
    formatSpreadsheetValues
  );
  const newFoundSkuArray = [];
  const skusToKeepMonitoring = [];
  for (const width of imageDementions) {
    let noImageResponse = await Api.FetchNoResponseImage({ width });
    noImageResponse = new Uint8Array(noImageResponse).toString();
    for (let index = 0; index < skuArray.length; index++) {
      const sku = skuArray[index][0];
      const photoBuffers = await Api.FetchImages({
        sku,
        width,
        noImageResponse,
      });
      if (photoBuffers.length === 0) {
        console.log(`No Images found for Sku: ${sku}. Removing from array.`);
        const spreadsheetArray = [skuArray[index][0].replace("_", "-")];
        if (skuArray[index][1]) spreadsheetArray.push(skuArray[index][1]);
        skusToKeepMonitoring.push(spreadsheetArray);
        skuArray.splice(index, 1);
        index--;
        continue;
      }
      const imageArray = await SavePhoto(photoBuffers);
      if (width === 1500) {
        newFoundSkuArray.push(sku);
        for (const image of imageArray) {
          const embed = new EmbededBuilder()
            .setTitle("New Image Loaded!")
            .setDescription(`Sku: ${sku.replace("_", "-")}`)
            .setImage(image)
            .setColor("#d11515")
            .setTimestamp();
          webhookClient.send({
            username: "Official Nike Photos",
            embeds: [embed],
          });
        }
      }
      console.log(
        `Checked Sku: ${sku} Size: ${width}x${width} Found images: ${photoBuffers.length}`
      );
    }
  }
  if (newFoundSkuArray.length > 0) {
    let existingFoundSkus = await getSpreadsheetValues(
      process.env.FOUND_SKU_RANGE
    );
    const formattedNewSkuArray = newFoundSkuArray.map((sku) => [
      sku.replace("_", "-"),
    ]);
    // add new found skus to existing found skus
    if (existingFoundSkus) {
      existingFoundSkus.push(...formattedNewSkuArray);
    } else {
      existingFoundSkus = formattedNewSkuArray;
    }
    await updateSpreadsheetValues({
      values: existingFoundSkus,
      updateRange: process.env.FOUND_SKU_RANGE,
    });
  }
  if (skusToKeepMonitoring.length > 0 && newFoundSkuArray.length > 0)
    await updateSpreadsheetValues({
      values: skusToKeepMonitoring,
      updateRange: process.env.NEW_SKU_RANGE,
    });
};

if (isDev) {
  main();
} else {
  nodeCron
    .schedule("*/5 7-19 * * 1-6", async () => {
      console.log(
        `[${
          process.env.NODE_ENV
        }] Starting Nike Image Scrape: ${new Date().toLocaleString("en-US")}`
      );
      await main();
      console.log(
        `[${
          process.env.NODE_ENV
        }] Finished Nike Image Scrape: ${new Date().toLocaleString("en-US")}`
      );
    })
    .start();
}
