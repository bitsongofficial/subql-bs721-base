import { z } from "zod";
import fetch from "node-fetch";
import { Attribute } from "../types/proto-interfaces/cosmos/base/abci/v1beta1/abci";
import { ContentSchemaId, TrackSchema, contentWith } from "@bitsongjs/metadata"

type TrackSchema = z.infer<typeof TrackSchema>;

export const NftSchema = contentWith({
  $schema: z.literal("https://json-schemas.bitsong.io/metadata/nft/1.0.0.json"),
  bitsong: z.any().optional(),
});

type NftSchema = z.infer<typeof NftSchema>;

const schemaValidator = z.object({
  $schema: z.union([
    z.literal("https://json-schemas.bitsong.io/metadata/nft/1.0.0.json"),
    z.literal(ContentSchemaId.TRACK_LATEST),
  ]),
})

export const getContractAddressesByCodeId = (attributes: readonly Attribute[], codeId: string): string[] => {
  const addresses: string[] = [];

  attributes.forEach((attribute, index) => {
    if (attribute.key === "code_id" && attribute.value === codeId) {
      const prevAttr = attributes[index - 1];
      if (prevAttr && prevAttr.key === "_contract_address") {
        addresses.push(prevAttr.value);
      }
    }
  });

  return addresses;
};

export const fetchMetadata = async (uri: string): Promise<NftSchema | TrackSchema | undefined> => {
  logger.info(`Fetching metadata from ${uri}`);

  try {
    uri = uri.replace("ipfs://", "https://media-api.bitsong.studio/ipfs/");

    const response = await fetch(uri);
    const data = await response.json();

    const { $schema } = schemaValidator.parse(data);

    if ($schema === ContentSchemaId.TRACK_LATEST) {
      return TrackSchema.parse(data);
    }

    return NftSchema.parse(data);
  } catch (error) {
    logger.error(`Error while fetching metadata: ${error}`);
  }
}

interface MintAttribute {
  contractAddress: string;
  minter: string;
  owner: string;
  tokenId: string;
}

export const getMintAttributes = (attributes: readonly Attribute[]): MintAttribute[] => {
  const mintAttributes: MintAttribute[] = [];

  attributes.forEach((attribute, index) => {
    if (attribute.key === "action" && attribute.value === "mint") {
      const contractAddress = attributes[index - 1].value;
      const minter = attributes[index + 1].value;
      const owner = attributes[index + 2].value;
      const tokenId = attributes[index + 3].value;

      mintAttributes.push({ contractAddress, minter, owner, tokenId });
    }
  });

  return mintAttributes;
}

interface BurnAttribute {
  contractAddress: string;
  sender: string;
  tokenId: string;
}

export const getBurnAttributes = (attributes: readonly Attribute[]): BurnAttribute[] => {
  const burnAttributes: BurnAttribute[] = [];

  attributes.forEach((attribute, index) => {
    if (attribute.key === "action" && attribute.value === "burn") {
      const contractAddress = attributes[index - 1].value;
      const sender = attributes[index + 1].value;
      const tokenId = attributes[index + 2].value;

      burnAttributes.push({ contractAddress, sender, tokenId });
    }
  });

  return burnAttributes;
}

interface TransferAttribute {
  contractAddress: string;
  sender: string;
  recipient: string;
  tokenId: string;
}

export const getTransferAttributes = (attributes: readonly Attribute[]): TransferAttribute[] => {
  const transferAttributes: TransferAttribute[] = [];

  attributes.forEach((attribute, index) => {
    if (attribute.key === "action" && (attribute.value === "transfer_nft" || attribute.value === "send_nft")) {
      const contractAddress = attributes[index - 1].value;
      const sender = attributes[index + 1].value;
      const recipient = attributes[index + 2].value;
      const tokenId = attributes[index + 3].value;

      transferAttributes.push({ contractAddress, sender, recipient, tokenId });
    }
  });

  return transferAttributes;
}