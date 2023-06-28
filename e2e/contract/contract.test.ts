import request from "supertest";
import createServer from "../../server/helpers/server";
import { expect } from "chai";
import { FastifyInstance } from "fastify";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { getSDK } from "../../core";

describe("Contract Endpoints Test Cases", () => {
  let createdServerInstance: FastifyInstance;
  let signers: SignerWithAddress[],
    adminWallet: string,
    samWallet: SignerWithAddress,
    bobWallet: SignerWithAddress;
  let deployedContractAddress: string;

  before(async () => {
    const sdk = await getSDK("localhost");
    adminWallet = await sdk.getSigner()?.getAddress()!;
    // [adminWallet, samWallet, bobWallet] = signers;
    createdServerInstance = await createServer("Test-Suite");
    const contractDeployedResponse = await request(createdServerInstance.server)
      .post("/deployer/localhost/prebuilts/editionDrop")
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
    createdServerInstance.log.info(
      `Contract deployed ${deployedContractAddress}`,
    );
    // done();
  });

  beforeEach(function (done) {
    setTimeout(done, 5000);
  });

  describe("Roles Testing", () => {
    it("should return 200 when contract all roles are fetched successfully", async () => {
      createdServerInstance.log.info(`Admin wallet: ${adminWallet}`);
      createdServerInstance.log.info(`Deployed: ${deployedContractAddress}`);

      const response = await request(createdServerInstance.server)
        .get(`/contract/localhost/${deployedContractAddress}/roles/getAll`)
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
