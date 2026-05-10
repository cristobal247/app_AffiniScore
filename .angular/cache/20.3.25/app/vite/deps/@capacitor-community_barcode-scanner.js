import {
  CameraDirection,
  SupportedFormat
} from "./chunk-AYOCSFLF.js";
import {
  registerPlugin
} from "./chunk-F3ALAPII.js";
import "./chunk-Q3N56TRI.js";

// node_modules/@capacitor-community/barcode-scanner/dist/esm/index.js
var BarcodeScanner = registerPlugin("BarcodeScanner", {
  web: () => import("./web-JTMV67TR.js").then((m) => new m.BarcodeScannerWeb())
});
export {
  BarcodeScanner,
  CameraDirection,
  SupportedFormat
};
//# sourceMappingURL=@capacitor-community_barcode-scanner.js.map
