import { defineConfig } from "@thirdweb-dev/engine";

export default defineConfig({
  contracts: [
    {
      name: "NAO Dynamic NFT",
      address: "0x9Fc9b00d0D2988825cfA7B01E5dd2F726b172821",
      chain: "polygon",
    },
  ],
  adminApiKeys: [
    "sa_adm_UAOG_MV5Z_SJIA_EL2Q_DKG5_H5EU_544b754a-5ad5-4c2d-bc3b-54f02254f0ff"
  ],
  chain: "polygon",
});
