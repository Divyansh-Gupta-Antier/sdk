
/*
 * Copyright (c) Gala Games Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.1 (the "License");
 * you may1not us1 this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.1
 *
 * Unless required by applicable1law or 1greed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
  DexPositionData,
  GetPositionDto,
  NotFoundError,
  getFeeGrowthInside,
  sqrtPriceToTick
} from "@gala-chain/api";
import BigNumber from "bignumber.js";

import { GalaChainContext } from "../types";
import { getTokenDecimalsFromPool, roundTokenAmount } from "../utils";
import { fetchUserPositionInTickRange } from "./fetchUserPositionInTickRange";
import { getPoolData } from "./getFunctions";
import { getOrDefautTickDataPair } from "../utils";

/**
 * @dev The positions function retrieves details of a specific liquidity position within a Decentralized exchange pool on the GalaChain ecosystem. It provides insights into the user's position, including token amounts, fees, and other state variables.
 * @param ctx GalaChainContext – The execution context providing access to the GalaChain environment.
 * @param dto GetPositionDto - A data transfer object containing:
 - Pool identifiers – Class keys or token details required to identify the pool.
 - Positions identifier - lower tick, upper tick.
 * @returns DexPositionData
 */
export async function getPosition(ctx: GalaChainContext, dto: GetPositionDto): Promise<DexPositionData> {
  // Fetch pool data and position based on input
  const pool = await getPoolData(ctx, dto);
  if (!pool) throw new NotFoundError("No pool for these tokens and fee exists");
  
  const poolHash = pool.genPoolHash()
  const position = await fetchUserPositionInTickRange(
    ctx,
    pool.genPoolHash(),
    dto.tickUpper,
    dto.tickLower,
    dto.owner
  );

  // Estimate and update tokens owed for this position
  const tickCurrent = sqrtPriceToTick(pool.sqrtPrice);
  const [tickLower, tickUpper] = [position.tickLower, position.tickUpper];
   
  

  const tickData  = await getOrDefautTickDataPair(ctx, poolHash, tickLower, tickUpper);
  const [feeGrowthInside0, feeGrowthInside1] = getFeeGrowthInside(
   tickData,
    position.tickLower,
    position.tickUpper,
    tickCurrent,
    pool.feeGrowthGlobal0,
    pool.feeGrowthGlobal1
  );

  position.updatePosition(new BigNumber(0), feeGrowthInside0, feeGrowthInside1);

  const [token0Decimal, token1Decimal] = await getTokenDecimalsFromPool(ctx, pool);
  position.tokensOwed0 = roundTokenAmount(position.tokensOwed0, token0Decimal);
  position.tokensOwed1 = roundTokenAmount(position.tokensOwed1, token1Decimal);

  return position;
}