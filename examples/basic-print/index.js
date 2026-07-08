import { Portix } from "@portixone/sdk";

// Mock mode: zero setup, no runtime, no printer — good for a first try.
// Switch to a real print once the Portix Runtime is running
// (https://github.com/portixhq/portixone/tree/master/runtime) by replacing
// this with `new Portix({ appId: "basic-print", tenant: "default" })` — see
// this example's README for what happens on that first real run.
const portix = new Portix({ mode: "mock" });

await portix.connect();

const result = await portix.print({
  content: "Hello from examples/basic-print!",
});

console.log("print() result:", result);
