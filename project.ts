import {
  CosmosDatasourceKind,
  CosmosHandlerKind,
  CosmosProject,
} from "@subql/types-cosmos";

// Can expand the Datasource processor types via the genreic param
const project: CosmosProject = {
  specVersion: "1.0.0",
  version: "0.0.1",
  name: "bitsong-bs721-base",
  description:
    "",
  runner: {
    node: {
      name: "@subql/node-cosmos",
      version: ">=3.0.0",
    },
    query: {
      name: "@subql/query",
      version: "*",
    },
  },
  schema: {
    file: "./schema.graphql",
  },
  network: {
    /* The unique chainID of the Cosmos Zone */
    chainId: "bitsong-2b",
    /**
     * These endpoint(s) should be public non-pruned archive node
     * We recommend providing more than one endpoint for improved reliability, performance, and uptime
     * Public nodes may be rate limited, which can affect indexing speed
     * When developing your project we suggest getting a private API key
     * If you use a rate limited endpoint, adjust the --batch-size and --workers parameters
     * These settings can be found in your docker-compose.yaml, they will slow indexing but prevent your project being rate limited
     */
    endpoint: ["https://rpc.explorebitsong.com"],
    chaintypes: new Map([
      [
        "cosmos.base.v1beta1",
        {
          file: "./proto/cosmos/cosmos.base.v1beta1.coin.proto",
          messages: ["Coin"]
        }
      ],
      [
        "bitsong.fantoken",
        {
          file: "./proto/bitsong/fantoken/v1beta1/tx.proto",
          messages: ["MsgIssue", "MsgDisableMint", "MsgMint", "MsgBurn", "MsgSetMinter", "MsgSetAuthority", "MsgSetUri"]
        }
      ],
      [
        "bitsong.fantoken.v1beta1",
        {
          file: "./proto/bitsong/fantoken/v1beta1/events.proto",
          messages: ["EventIssue", "EventDisableMint", "EventMint", "EventBurn", "EventSetAuthority", "EventSetMinter", "EventSetUri"]
        }
      ],
      [
        "bitsong.merkledrop.v1beta1",
        {
          file: "./proto/bitsong/merkledrop/v1beta1/events.proto",
          messages: ["EventCreate", "EventClaim", "EventWithdraw"]
        }
      ]
    ])
  },
  dataSources: [
    {
      kind: CosmosDatasourceKind.Runtime,
      startBlock: 14963829, // Studio genesis block
      mapping: {
        file: "./dist/index.js",
        handlers: [
          {
            handler: "handleInstantiate",
            kind: CosmosHandlerKind.Event,
            filter: {
              type: "instantiate",
              attributes: {
                code_id: "1", // bs721-base store code_id
              },
            },
          },
          {
            handler: "handleMint",
            kind: CosmosHandlerKind.Event,
            filter: {
              type: "wasm",
              attributes: {
                action: "mint",
              },
            },
          },
          {
            handler: "handleBurn",
            kind: CosmosHandlerKind.Event,
            filter: {
              type: "wasm",
              attributes: {
                action: "burn",
              },
            },
          },
          {
            handler: "handleTransfer",
            kind: CosmosHandlerKind.Event,
            filter: {
              type: "wasm",
              attributes: {
                action: "transfer_nft",
              },
            },
          },
          {
            handler: "handleTransfer",
            kind: CosmosHandlerKind.Event,
            filter: {
              type: "wasm",
              attributes: {
                action: "send_nft",
              },
            },
          },
        ],
      },
    },
  ],
};

// Must set default to the project instance
export default project;
