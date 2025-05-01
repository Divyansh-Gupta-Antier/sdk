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
import { DexPosition, GetPositionWithNftIdDto, NotFoundError, getFeeGrowthInside, sqrtPriceToTick } from "@gala-chain/api";
import BigNumber from "bignumber.js";

import { GalaChainContext } from "../types";
import { fetchDexPosition } from "../utils";
import { getPoolData } from "./getFunctions";

/**
 * @dev The positions function retrieves details of a specific liquidity position within the Dex pool on the GalaChain ecosystem. It provides insights into the user's position, including token amounts, fees, and other state variables.
 * @param ctx GalaChainContext – The execution context providing access to the GalaChain environment.
 * @param dto GetPositionDto - A data transfer object containing:
 - Pool identifiers – Class keys or token details required to identify the pool.
 - NFT identifier - unique NFT that identifies a position in a pool
 * @returns DexPosition
 */
export async function getPositionWithNftId(
  ctx: GalaChainContext,
  dto: GetPositionWithNftIdDto
): Promise<DexPosition> {
  // Fetch pool data based on input
  const pool = await getPoolData(ctx, dto);
  if (!pool) throw new NotFoundError("No pool for these tokens and fee exists");

  // Fetch position from chain storage
  const position = await fetchDexPosition(ctx, pool, dto.nftId);

  // Estimate and update tokens owed
  const tickCurrent = sqrtPriceToTick(pool.sqrtPrice);
  const [feeGrowthInside0, feeGrowthInside1] = getFeeGrowthInside(
    pool.tickData,
    position.tickLower,
    position.tickUpper,
    tickCurrent,
    pool.feeGrowthGlobal0,
    pool.feeGrowthGlobal1
  );

  position.updatePosition(new BigNumber(0), feeGrowthInside0, feeGrowthInside1);
  return position;
}
