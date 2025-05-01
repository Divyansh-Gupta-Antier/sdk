/*
 * Copyright (c) Gala Games Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
  ChainError,
  DexPosition,
  ErrorCode,
  MintTokenDto,
  NotFoundError,
  Pool,
  TokenBalance,
  TokenClassKey,
  TokenInstanceKey
} from "@gala-chain/api";
import BigNumber from "bignumber.js";
import { plainToInstance } from "class-transformer";
import { keccak256 } from "js-sha3";

import { fetchBalances } from "../balances";
import { mintTokenWithAllowance } from "../mint";
import { createTokenClass, updateTokenClass } from "../token";
import { transferToken } from "../transfer";
import { GalaChainContext } from "../types";
import { fetchDexPosition, genNftId, parseNftId, putChainObject } from "../utils";
import { fetchDexNftBatchLimit } from "./fetchDexNftBatchLimit";

const LIQUIDITY_TOKEN_COLLECTION = "DexNFT";
const LIQUIDITY_TOKEN_CATEGORY = "LiquidityPositions";

/**
 * @dev Assigns a new position NFT within a specified pool. This function ensures that there are
 *      available NFTs for assignment. If no NFTs are present, it generates a new batch. If the last
 *      available NFT has only one instance remaining, a new batch is also created to prevent exhaustion.
 *      After assignment, it creates and stores a new DexPosition associated with the assigned NFT.
 *
 * @param ctx GalaChainContext – The execution context for the GalaChain environment.
 * @param poolHash string – The unique identifier for the DEX pool.
 * @param poolAlias string – The virtual address representing the pool.
 * @param tickUpper number – The upper tick boundary for the new position.
 * @param tickLower number – The lower tick boundary for the new position.
 *
 * @returns DexPosition – The newly created DexPosition object associated with the assigned NFT.
 */
export async function createPosition(
  ctx: GalaChainContext,
  poolHash: string,
  poolAlias: string,
  tickUpper: number,
  tickLower: number
): Promise<DexPosition> {
  // Fetch existing NFTs for the given pool
  let nfts = await fetchPositionNfts(ctx, poolHash, poolAlias);
  let lastNft = nfts.at(-1);

  // If no NFTs found, generate a new batch
  if (!lastNft) {
    await generatePositionNftBatch(ctx, "1", poolHash, poolAlias);
    nfts = await fetchPositionNfts(ctx, poolHash, poolAlias);
    lastNft = nfts.at(-1)!;
  }
  // If the last NFT has only one instance, prepare the next batch
  else if (lastNft.getNftInstanceIds().length === 1) {
    await generatePositionNftBatch(
      ctx,
      new BigNumber(lastNft.additionalKey).plus(1).toString(),
      poolHash,
      poolAlias
    );
  }

  // Transfer NFT and create a new position
  const newNftId = await transferPositionNft(ctx, poolHash, poolAlias, lastNft!);
  const newPosition = new DexPosition(poolHash, newNftId, tickUpper, tickLower);

  // Save the new position to the chain
  await putChainObject(ctx, newPosition);

  return newPosition;
}

/**
 * @dev Function to fetch position NFTs for a given pool. The fetchPositionNfts function retrieves
 *      all NFTs associated with a specified pool and owner by querying the blockchain ledger.
 *
 * @param ctx GalaChainContext – The execution context that provides access to the GalaChain environment.
 * @param poolHash string – The unique key identifying the DEX pool.
 * @param owner string – The address of the owner whose NFTs are being retrieved.
 *
 * @returns Promise<TokenBalance[]> – A promise resolving to the list of NFTs associated with the specified pool and owner.
 */
async function fetchPositionNfts(ctx: GalaChainContext, poolHash: string, owner: string) {
  return fetchBalances(ctx, {
    collection: LIQUIDITY_TOKEN_COLLECTION,
    category: LIQUIDITY_TOKEN_CATEGORY,
    type: poolHash,
    owner
  });
}

/**
 * @dev Function to transfer a position NFT. The transferPositionNft function facilitates the
 *      transfer of a specified NFT instance from one owner to another.
 *
 * @param ctx GalaChainContext – The execution context that provides access to the GalaChain environment.
 * @param poolHash string – The unique key identifying the DEX pool.
 * @param from string – The address of the current owner transferring the NFT.
 * @param nft TokenBalance – The NFT token balance containing the instance to be transferred.
 *
 * @returns Promise<string> – A promise resolving to the generated key of the transferred NFT instance.
 */ async function transferPositionNft(
  ctx: GalaChainContext,
  poolHash: string,
  from: string,
  nft: TokenBalance
): Promise<string> {
  const instanceId = nft.getNftInstanceIds()[0];
  const tokenInstanceKey = TokenInstanceKey.nftKey(
    {
      collection: LIQUIDITY_TOKEN_COLLECTION,
      category: LIQUIDITY_TOKEN_CATEGORY,
      type: poolHash,
      additionalKey: nft.additionalKey
    },
    instanceId
  );

  await transferToken(ctx, {
    from,
    to: ctx.callingUser,
    tokenInstanceKey,
    quantity: new BigNumber(1),
    allowancesToUse: [],
    authorizedOnBehalf: {
      callingOnBehalf: from,
      callingUser: from
    }
  });

  return genNftId(nft.additionalKey, instanceId.toString());
}

/**
 * @dev Function to generate a batch of position NFTs. The generatePositionNftBatch function
 *      creates a new batch of NFTs representing liquidity positions
 *
 * @param ctx GalaChainContext – The execution context that provides access to the GalaChain environment.
 * @param batchNumber string – The identifier for the NFT batch being generated.
 * @param poolHash string – The unique key identifying the DEX pool.
 * @param poolAlias string – The virtual address associated with the liquidity pool.
 *
 * @returns Promise<void> – A promise that resolves once the NFT batch has been created and minted.
 */
export async function generatePositionNftBatch(
  ctx: GalaChainContext,
  batchNumber: string,
  poolHash: string,
  poolAlias: string
): Promise<void> {
  const holder = poolAlias;
  const tokenClassKey = plainToInstance(TokenClassKey, {
    collection: LIQUIDITY_TOKEN_COLLECTION,
    category: LIQUIDITY_TOKEN_CATEGORY,
    type: poolHash,
    additionalKey: batchNumber
  });

  // Fetch NFT batch configuration
  const nftBatchLimit = await fetchDexNftBatchLimit(ctx).catch((e) => {
    const chainError = ChainError.from(e);
    if (chainError.matches(ErrorCode.NOT_FOUND)) {
      return undefined;
    } else {
      throw chainError;
    }
  });

  const maxNftLimit = nftBatchLimit?.maxSupply ?? new BigNumber(100);
  const uniqueSymbol = Buffer.from(keccak256.array(poolHash))
    .toString("base64")
    .replace(/[^a-zA-Z]/g, "")
    .slice(0, 8);

  await createTokenClass(ctx, {
    network: "GC",
    tokenClass: tokenClassKey,
    isNonFungible: true,
    decimals: 0,
    name: `Dex Liquidity Positions for ${poolHash}`,
    symbol: uniqueSymbol,
    description: `NFTs representing liquidity positions in the dex pool with Id ${poolHash}`,
    image: "https://static.gala.games/images/icons/units/gala.png",
    maxSupply: maxNftLimit,
    maxCapacity: maxNftLimit,
    totalMintAllowance: new BigNumber(0),
    totalSupply: new BigNumber(0),
    totalBurned: new BigNumber(0),
    authorities: [holder, ctx.callingUser]
  });

  // Mint maxNftLimit limit number of NFTs in each batch
  const totalMintCalls = maxNftLimit.dividedToIntegerBy(MintTokenDto.MAX_NFT_MINT_SIZE);
  for (let mintStep = 0; totalMintCalls.isGreaterThanOrEqualTo(mintStep); mintStep++) {
    await mintTokenWithAllowance(ctx, {
      tokenClassKey,
      tokenInstance: new BigNumber(0),
      owner: holder,
      quantity: totalMintCalls.isEqualTo(mintStep)
        ? maxNftLimit.modulo(MintTokenDto.MAX_NFT_MINT_SIZE)
        : new BigNumber(MintTokenDto.MAX_NFT_MINT_SIZE)
    });
  }
}

/**
 * @dev Function to fetch the NFT ID of a user's liquidity position. The fetchUserPositionInTickRange
 *      function retrieves the NFT instance associated with a specific liquidity position in a pool,
 *      based on tick values.
 *
 * @param ctx GalaChainContext – The execution context that provides access to the GalaChain environment.
 * @param pool Pool – The pool object containing liquidity positions.
 * @param tickUpper string – The upper tick value of the liquidity position.
 * @param tickLower string – The lower tick value of the liquidity position.
 * @param owner string (Optional) – The address of the owner whose position NFT is being retrieved.
 *                                 Defaults to the calling user if not provided.
 *
 * @returns Promise<string | undefined> – The NFT ID if a matching position is found, otherwise undefined.
 */
export async function fetchUserPositionInTickRange(
  ctx: GalaChainContext,
  pool: Pool,
  tickUpper: number,
  tickLower: number,
  owner?: string
): Promise<DexPosition | undefined> {
  const ownerPositions = await fetchPositionNfts(ctx, pool.genPoolHash(), owner ?? ctx.callingUser);
  if (!ownerPositions.length) return undefined;
  for (const nftBatch of ownerPositions) {
    const batchNumber = nftBatch.additionalKey;

    for (const instanceId of nftBatch.getNftInstanceIds()) {
      const nftId = genNftId(batchNumber, instanceId.toString());
      const position = await fetchDexPosition(ctx, pool, nftId);
      if (position.tickUpper == tickUpper && position.tickLower == tickLower) {
        return position; // This will properly return from fetchUserPositionInTickRange
      }
    }
  }
}

/**
 * @dev Function to fetch the token instance key of a position NFT.
 *
 * @param ctx GalaChainContext – The execution context that provides access to the GalaChain environment.
 * @param poolHash string – The unique key identifying the DEX pool.
 * @param nftId string – The identifier of the NFT instance.
 *
 * @returns Promise<TokenInstanceKey> – A promise resolving to the instance key of the specified NFT.
 *
 * @throws NotFoundError – If the specified NFT instance cannot be found.
 */ export async function fetchPositionNftInstanceKey(
  ctx: GalaChainContext,
  poolHash: string,
  nftId: string
): Promise<TokenInstanceKey> {
  const { instanceId, batchNumber } = parseNftId(nftId);
  const nft = await fetchBalances(ctx, {
    collection: LIQUIDITY_TOKEN_COLLECTION,
    category: LIQUIDITY_TOKEN_CATEGORY,
    type: poolHash,
    additionalKey: batchNumber,
    owner: ctx.callingUser
  });

  if (!nft[0].getNftInstanceIds().some((instance) => instance.isEqualTo(instanceId)))
    throw new NotFoundError("Cannot find this NFT");

  const instanceKey = new TokenInstanceKey();
  instanceKey.collection = nft[0].collection;
  instanceKey.category = nft[0].category;
  instanceKey.type = nft[0].type;
  instanceKey.additionalKey = nft[0].additionalKey;
  instanceKey.instance = instanceId;
  return instanceKey;
}
