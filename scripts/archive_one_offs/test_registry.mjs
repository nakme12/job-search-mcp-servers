import { loadMasterStatusRegistry } from "../servers/master-status-filter.js";
const reg = loadMasterStatusRegistry();
console.log("Check test 1 (random link):", reg.checkStatus("https://example.com/job/123"));
