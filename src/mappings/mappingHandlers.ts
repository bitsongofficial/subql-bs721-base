import { CosmosEvent } from "@subql/types-cosmos";
import { fetchMetadata, getContractAddressesByCodeId, getMintAttributes, getBurnAttributes, getTransferAttributes } from "./utils";
import { Nft, NftAttribute, NftMetadata, NftToken, NftTokenBurn, NftTokenTransfer, NftTrackMetadata } from "../types";

export async function handleInstantiate(event: CosmosEvent): Promise<void> {
  try {
    const contractAddresses = getContractAddressesByCodeId(event.event.attributes, "1");
    const { sender } = event.msg.msg.decodedMsg

    logger.info(`Contract Address: `)
    logger.info(`  ${contractAddresses.join(", ")}`)

    logger.info(`Sender: `)
    logger.info(`  ${sender}`)

    for (const address of contractAddresses) {
      // TODO: the `queryContractSmart` method currently queries the current state of the chain,
      // instead it should query the state at the event block

      const { name, symbol, uri } = await api.queryContractSmart(address, { contract_info: {} });
      logger.info(`Contract Data: `)
      logger.info(`  Name: ${name}`)
      logger.info(`  Symbol: ${symbol}`)
      logger.info(`  URI: ${uri}`)

      const { minter } = await api.queryContractSmart(address, { minter: {} });
      logger.info(`Minter: ${minter} `)

      if (uri) {
        const hasMetadata = await NftMetadata.get(uri)

        if (!hasMetadata) {
          const metadata = await fetchMetadata(uri);
          logger.info(`Metadata: `)
          logger.info(JSON.stringify(metadata, null, 2))

          if (metadata) {
            const nftMetadata = NftMetadata.create({
              id: uri,
              // @ts-expect-error
              schema: metadata.$schema as string,
              name: metadata.name as string,
              description: metadata.description as string,
              image: metadata.image as string,
              animation_url: metadata.animation_url as string,
              external_url: metadata.external_url as string,
              attributes: metadata.attributes as NftAttribute[] | undefined,
              bitsong: metadata.bitsong as NftTrackMetadata | undefined
            })

            await nftMetadata.save();
            logger.info(`Metadata ${uri} created`)
          }
        }
      }

      const nft = Nft.create({
        id: address,
        name,
        symbol,
        uri,
        metadataId: uri,
        sender,
        minter,
        blockHeight: BigInt(event.block.block.header.height),
        txHash: event.tx.hash,
        createdAt: event.block.block.header.time,
      })

      await nft.save();
      logger.info(`NFT ${address} created`)
    }
  } catch (e) {
    logger.error(`Error while processing handleInstantiate: ${e}`)
  }
}

export async function handleMint(event: CosmosEvent): Promise<void> {
  try {
    const attributes = getMintAttributes(event.event.attributes);
    logger.info(`Mint Attributes: ${attributes.length}`)

    for (const attribute of attributes) {
      logger.info(`Contract Address: ${attribute.contractAddress}`)
      logger.info(`Minter: ${attribute.minter}`)
      logger.info(`Owner: ${attribute.owner}`)
      logger.info(`Token ID: ${attribute.tokenId}`)
      logger.info(`---------------------------------`)

      const nftToken = NftToken.create({
        id: `${attribute.contractAddress}:${attribute.tokenId}`,
        nftId: attribute.contractAddress,
        tokenId: attribute.tokenId,
        minter: attribute.minter,
        owner: attribute.owner,
        blockHeight: BigInt(event.block.block.header.height),
        txHash: event.tx.hash,
        createdAt: event.block.block.header.time,
        updatedAt: event.block.block.header.time,
      })
      await nftToken.save();
    }
  } catch (e) {
    logger.error(`Error while processing handleMint: ${e}`)
  }
}

export async function handleBurn(event: CosmosEvent): Promise<void> {
  try {
    const attributes = getBurnAttributes(event.event.attributes);
    logger.info(`Burn Attributes: ${attributes.length}`)

    for (const attribute of attributes) {
      logger.info(`Contract Address: ${attribute.contractAddress}`)
      logger.info(`Sender: ${attribute.sender}`)
      logger.info(`Token ID: ${attribute.tokenId}`)
      logger.info(`---------------------------------`)

      const nftBurn = NftTokenBurn.create({
        id: `${attribute.contractAddress}:${attribute.tokenId}:burn`,
        nftId: attribute.contractAddress,
        burner: attribute.sender,
        nftTokenId: `${attribute.contractAddress}:${attribute.tokenId}`,
        blockHeight: BigInt(event.block.block.header.height),
        txHash: event.tx.hash,
        createdAt: event.block.block.header.time,
      })

      await nftBurn.save();
    }
  } catch (e) {
    logger.error(`Error while processing handleMint: ${e}`)
  }
}

export async function handleTransfer(event: CosmosEvent): Promise<void> {
  try {
    const attributes = getTransferAttributes(event.event.attributes);
    logger.info(`Transfer Attributes: ${attributes.length}`)

    for (const attribute of attributes) {
      logger.info(`Contract Address: ${attribute.contractAddress}`)
      logger.info(`Sender: ${attribute.sender}`)
      logger.info(`Recipient: ${attribute.recipient}`)
      logger.info(`Token ID: ${attribute.tokenId}`)
      logger.info(`---------------------------------`)

      const nftToken = await NftToken.get(`${attribute.contractAddress}:${attribute.tokenId}`);

      if (nftToken) {
        nftToken.owner = attribute.recipient;
        nftToken.updatedAt = event.block.block.header.time;
        await nftToken.save();
      }

      const nftTransfer = NftTokenTransfer.create({
        id: `${attribute.contractAddress}:${attribute.tokenId}:${event.msg.idx}`,
        nftId: attribute.contractAddress,
        nftTokenId: `${attribute.contractAddress}:${attribute.tokenId}`,
        from: attribute.sender,
        to: attribute.recipient,
        blockHeight: BigInt(event.block.block.header.height),
        txHash: event.tx.hash,
        createdAt: event.block.block.header.time,
      })

      await nftTransfer.save();
    }
  } catch (e) {
    logger.error(`Error while processing handleTransfer: ${e}`)
  }
}