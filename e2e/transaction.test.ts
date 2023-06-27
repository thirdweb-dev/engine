import request from "supertest";
import createServer from "../server/helpers/server";
import { FastifyInstance } from "fastify";
import { expect } from "chai";

describe("E2E Test", () => {
  let tx_queue_id: string;

  it("should return a specific transaction request data when tx_queue_id is provided", async () => {
    const response = await request((await createServer()).server).get(
      "/transaction/status/8fe7d546-2b8b-465e-b0d2-f1cb5d3d0db3",
    );

    expect(response.status).to.equal(404);
  });
});
