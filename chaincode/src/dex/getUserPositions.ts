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
  DexPositionOwner,
  GetUserPositionsDto,
  GetUserPositionsResDto,
  IPosition,
  PositionsObject,
  TokenInstanceKey,
  ValidationFailedError
} from "@gala-chain/api";
import BigNumber from "bignumber.js";

import { fetchTokenClass } from "../token";
import { GalaChainContext } from "../types";
import {
  fetchDexPosition,
  genBookMark,
  getObjectsByPartialCompositeKeyWithPagination,
  splitBookmark
} from "../utils";
import { getPoolFromAddressKey } from "./getFunctions";

/**
   * 
   * @dev The getUserPositions function retrieves all liquidity positions owned by a specific user across multiple Decentralized exchange pools within the GalaChain ecosystem. It provides details on the user's staked liquidity and associated rewards.
   * @param ctx GalaChainContext – The execution context providing access to the GalaChain environment.
   * @param dto GetUserPositionsDto – A data transfer object containing:
    - User address – The identifier for the user whose positions are being queried.
   * @returns GetUserPositionsResDto
   */
export async function getUserPositions(
  ctx: GalaChainContext,
  dto: GetUserPositionsDto
): Promise<GetUserPositionsResDto> {
  const { chainBookmark, localBookmark } = splitBookmark(dto.bookmark);

  let currentPageBookmark = chainBookmark;
  let positionsToSkip = Number(localBookmark);
  let positionsRequired = dto.limit;
  let newLocalBookmark = positionsToSkip + positionsRequired;
  let isLastIteration = false;
  const userPositions: PositionsObject = {};

  do {
    const userPositionIds = await getObjectsByPartialCompositeKeyWithPagination(
      ctx,
      DexPositionOwner.INDEX_KEY,
      [dto.owner],
      DexPositionOwner,
      dto.bookmark,
      dto.limit
    );
    newLocalBookmark = positionsToSkip + positionsRequired;

    const allPositionIds = userPositionIds.results.flatMap((userPosition) => {
      return [
        {
          [userPosition.poolHash]: userPosition.tickRangeMap
        }
      ];
    });

    console.log("###########################################")
    console.dir(allPositionIds, { depth: null, colors: true });
    console.log("###########################################")

    throw new Error()

    if (positionsToSkip >= allPositionIds.length) {
      positionsToSkip -= allPositionIds.length;
      currentPageBookmark = userPositionIds.metadata.bookmark ?? "";
      continue;
    }

    const selectedNft = allPositionIds.slice(positionsToSkip);
    positionsToSkip = 0;

    // for (const [nftIndex, nft] of selectedNft.entries()) {
    //   const pool = await getPoolFromAddressKey(ctx, nft.poolHash);
    //   userPositions[nft.poolHash] = userPositions[nft.poolHash] || [];
    //   const nftId = genNftId(nft.additionalKey, nft.nftInstanceId.toString());
    //   const { tickLower, tickUpper, liquidity } = await fetchDexPosition(ctx, pool, nftId);
    //   userPositions[nft.poolHash].push({ tickLower, tickUpper, liquidity: liquidity.toString() });
    //   positionsRequired--;
    //   isLastIteration = nftIndex === selectedNft.length - 1;
    //   if (positionsRequired === 0) break;
    // }

    currentPageBookmark = isLastIteration ? userPositionIds.metadata.bookmark ?? "" : currentPageBookmark;
  } while (positionsRequired && currentPageBookmark);

  if (positionsToSkip) {
    throw new ValidationFailedError("Invalid bookmark");
  }

  const newBookmark =
    !currentPageBookmark && isLastIteration
      ? ""
      : genBookMark(currentPageBookmark, isLastIteration ? "" : newLocalBookmark.toString());

  const userPositionWithMetadata = userPositions
    ? await addMetaDataToUserPositions(ctx, userPositions)
    : userPositions;
  return new GetUserPositionsResDto(userPositionWithMetadata, newBookmark);
}

/**
 *
 * @param ctx GalaChainContext – The execution context providing access to the GalaChain environment.
 * @param positions All user positions
 * @returns Modified user Positions by adding few properites like img, symbol etc.
 */
async function addMetaDataToUserPositions(
  ctx: GalaChainContext,
  positions: PositionsObject
): Promise<PositionsObject> {
  for (const [key, value] of Object.entries(positions)) {
    const pool = await getPoolFromAddressKey(ctx, key);
    const tokenInstanceKeys = [pool.token0ClassKey, pool.token1ClassKey].map(
      ({ collection, category, type, additionalKey }) =>
        Object.assign(new TokenInstanceKey(), {
          collection,
          category,
          type,
          additionalKey,
          instance: new BigNumber(0)
        })
    );

    const token0Data = await fetchTokenClass(ctx, tokenInstanceKeys[0]);
    const token1Data = await fetchTokenClass(ctx, tokenInstanceKeys[1]);

    value.forEach((e: IPosition) => {
      e.token0Img = token0Data.image;
      e.token1Img = token1Data.image;
      e.token0InstanceKey = tokenInstanceKeys[0];
      e.token1InstanceKey = tokenInstanceKeys[1];
      e.token0Symbol = token0Data.symbol;
      e.token1Symbol = token1Data.symbol;
    });
  }
  return positions;
}
