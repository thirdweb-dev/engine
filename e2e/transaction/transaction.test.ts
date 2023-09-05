import { expect } from "chai";
import { FastifyInstance } from "fastify";
import request from "supertest";
import { env } from "../../core";
import createServer from "../../server/helpers/server";

describe("Transaction End-point Test", () => {
  let createdServerInstance: FastifyInstance;

  beforeEach(async () => {
    createdServerInstance = await createServer("Test-Suite");
  });

  it("should return a specific transaction request data when tx_queue_id is provided", async () => {
    const response = await request(createdServerInstance.server)
      .get("/transaction/status/8fe7d546-2b8b-465e-b0d2-f1cb5d3d0db3")
      .set("Authorization", `Bearer ${env.THIRDWEB_API_SECRET_KEY}`)
      .send();

    expect(response.status).to.equal(200);
  });

  it("should return all transaction requests data", async () => {
    const response = await request(createdServerInstance.server)
      .get(
        "/transaction/getAll?page=1&limit=10&sort=createdTimestamp&sort_order=asc&filter=all",
      )
      .set("Authorization", `Bearer ${env.THIRDWEB_API_SECRET_KEY}`)
      .send();

    expect(response.status).to.equal(200);
  });

  it("should return all deployed contracts transaction data", async () => {
    const response = await request(createdServerInstance.server)
      .get(
        "/transaction/getAllDeployedContracts?page=1&limit=10&sort=createdTimestamp&sort_order=asc&filter=all",
      )
      .set("Authorization", `Bearer ${env.THIRDWEB_API_SECRET_KEY}`)
      .send();

    expect(response.status).to.equal(200);
    response.body.result.forEach((element: any) => {
      expect(element).to.has.property("deployedContractAddress");
      expect(element).to.has.property("extension");
      expect(element.extension).equals("deployer_prebuilt");
    });
  });
});
