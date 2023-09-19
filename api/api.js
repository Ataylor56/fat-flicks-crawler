const Axios = require("axios");

exports.FetchImages = async function FetchImages({
  sku,
  width,
  noImageResponse,
}) {
  const angles = [
    "A",
    "B",
    "C",
    "D",
    "E",
    "F",
    "G",
    "H",
    "I",
    "J",
    "K",
    "L",
    "M",
    "N",
    "O",
    "P",
    "Q",
    "R",
    "S",
    "T",
    "U",
    "V",
    "W",
    "X",
    "Y",
    "Z",
  ];
  const photoBuffers = [];
  const buildUrl = async () => {
    for (const angle of angles) {
      const url = `https://secure-images.nike.com/is/image/DotCom/${sku}_${angle}_PREM?wid=${width}&hei=${width}`;
      const response = await Axios.get(url, { responseType: "arraybuffer" });
      if (new Uint8Array(response.data).toString() !== noImageResponse) {
        // push URL to return array
        photoBuffers.push({ buffer: response.data, angle, sku, width });
      }
    }
  };
  await buildUrl();
  return photoBuffers;
};

exports.FetchNoResponseImage = async function FetchNoResponseImage({ width }) {
  const url = `https://secure-images.nike.com/is/image/DotCom/999999_999_Z_PREM?wid=${width}&hei=${width}`;
  const response = await Axios.get(url, { responseType: "arraybuffer" });
  return response.data;
};
