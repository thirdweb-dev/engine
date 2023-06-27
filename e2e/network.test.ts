import request from "supertest";
import createServer from "../server/helpers/server";
import { FastifyInstance } from "fastify";
import { expect } from "chai";

describe("E2E Test", () => {
  let tx_queue_id: string;

  it("should return mumbai network details", async () => {
    const response = await request((await createServer()).server).get(
      "/network/get/?network=mumbai",
    );

    expect(response.status).to.equal(200);
    console.log(JSON.stringify(response.body));
    // expect(response.body?.slug).to.equal("mumbai");
  });
});
