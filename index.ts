import { Engine } from "./dist/sdk";

async function main() {
  const engine = new Engine({
    url: "http://0.0.0.0:3005",
    accessToken:
      "n4vKXWdyJVuX7mBky3q5JdRSmueuL_JeNTRj4S-MRCU3PFcz2MHgX4OMopYB2KUyvmAcOF2u1f6_NmSFXhGG9w",
  });

  await engine.erc20.mintTo(
    "mumbai",
    "0x365b83D67D5539C6583b9c0266A548926Bf216F4",
    "0x43CAe0d7fe86C713530E679Ce02574743b2Ee9FC",
    {
      toAddress: "0x43CAe0d7fe86C713530E679Ce02574743b2Ee9FC",
      amount: "1.0",
    },
  );
}

main();
