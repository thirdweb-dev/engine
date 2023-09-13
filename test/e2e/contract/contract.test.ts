import { expect } from "chai";
import { FastifyInstance } from "fastify";
import request from "supertest";
import { env } from "../../../core";
import createServer from "../../../server/helpers/server";
import { awaitTransactionSubmission } from "../helpers";

// TODO: Something is off, probably should replace test suite...
describe.skip("Deploy EditionDrop to Test : Contract Endpoints", () => {
  let createdServerInstance: FastifyInstance;
  let deployedContractAddress: string;

  before(async () => {
    createdServerInstance = await createServer("Test-Suite");
    const contractDeployedResponse = await request(createdServerInstance.server)
      .post("/deployer/localhost/prebuilts/editionDrop")
      .set("Authorization", `Bearer ${env.THIRDWEB_API_SECRET_KEY}`)
      .set("x-wallet-address", "0xf39fd6e51aad88f6f4ce6ab8827279cfffb92266")
      .send({
        contractMetadata: {
          name: "Test",
          description: "Test Desc",
          merkle: {},
          symbol: "T",
          platform_fee_basis_points: 0,
          platform_fee_recipient: "0x0000000000000000000000000000000000000000",
          primary_sale_recipient: "0x3EcDBF3B911d0e9052b64850693888b008e18373",
          trusted_forwarders: [],
          seller_fee_basis_points: 0,
          fee_recipient: "0x0000000000000000000000000000000000000000",
        },
      });
    deployedContractAddress =
      contractDeployedResponse.body.result.deployedAddress;

    await awaitTransactionSubmission(
      createdServerInstance,
      contractDeployedResponse.body.result.queuedId,
    );
  });

  describe("Roles End-Point Tests", () => {
    it("should return 200 when contract all roles are fetched successfully", async () => {
      createdServerInstance.log.info(`Deployed: ${deployedContractAddress}`);

      const response = await request(createdServerInstance.server)
        .get(`/contract/localhost/${deployedContractAddress}/roles/getAll`)
        .set("Authorization", `Bearer ${env.THIRDWEB_API_SECRET_KEY}`)
        .send();

      expect(response.status).to.equal(200);
      expect(response.body.result).to.has.property("admin");
      expect(response.body.result).to.has.property("transfer");
      expect(response.body.result).to.has.property("minter");
      expect(response.body.result).to.has.property("pauser");
      expect(response.body.result).to.has.property("lister");
      expect(response.body.result).to.has.property("asset");
      expect(response.body.result).to.has.property("unwrap");
      expect(response.body.result).to.has.property("factory");
      expect(response.body.result).to.has.property("signer");
    });
  });
});
