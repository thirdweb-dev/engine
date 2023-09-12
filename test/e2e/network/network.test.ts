import { expect } from "chai";
import { FastifyInstance } from "fastify";
import request from "supertest";
import { env } from "../../../core";
import createServer from "../../../server/helpers/server";

describe("Network Endpoint Test", () => {
  let createdServerInstance: FastifyInstance;

  before(async () => {
    createdServerInstance = await createServer("Test-Suite");
  });

  it("should return mumbai network details", async () => {
    const response = await request(createdServerInstance.server)
      .get("/network/get?network=mumbai")
      .set("Authorization", `Bearer ${env.THIRDWEB_API_SECRET_KEY}`)
      .send();

    expect(response.status).to.equal(200);

    // Check if the response body is an object
    expect(response.body).to.be.an("object");

    expect(response.body).to.have.property("result");
    expect(response.body.result).to.be.an("object");
    expect(response.body.result).to.have.property("name", "Mumbai");
    expect(response.body.result).to.have.property("chain", "Polygon");
    expect(response.body.result).to.have.property("chainId", 80001);
    expect(response.body.result).to.have.property("slug", "mumbai");
    expect(response.body.result).to.have.property("testnet", true);
    expect(response.body.result.rpc).to.be.an("array");
    expect(response.body.result.rpc.length).to.be.greaterThanOrEqual(1);
  });

  it("should return all 700+ network details", async () => {
    const response = await request(createdServerInstance.server)
      .get("/network/getAll")
      .set("Authorization", `Bearer ${env.THIRDWEB_API_SECRET_KEY}`)
      .send();

    expect(response.status).to.equal(200);

    // Check if the response body is an object
    expect(response.body).to.be.an("object");

    expect(response.body).to.have.property("result");
    expect(response.body.result).to.be.an("array");
    expect(response.body.result.length).to.be.greaterThan(0);

    response.body.result.forEach((network: any) => {
      expect(network).to.have.property("name");
      expect(network).to.have.property("chain");
      expect(network).to.have.property("chainId");
      expect(network).to.have.property("slug");
      expect(network).to.have.property("testnet");
      expect(network).to.have.property("rpc");
    });
  });
});
