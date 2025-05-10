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
import { ChainError, DexPositionData, DexPositionOwner, ErrorCode } from "@gala-chain/api";
import { keccak256 } from "js-sha3";

import { GalaChainContext } from "../types";
import { genTickRange, getDexPosition, getObjectByKey, putChainObject } from "../utils";

/**
 * Fetches an existing DEX position for a user based on tick range and pool hash,
 * or creates a new one if it doesn't exist.
 *
 * @param ctx - The GalaChain context containing blockchain state and utilities
 * @param poolHash - The hash identifying the liquidity pool
 * @param tickUpper - The upper bound of the tick range
 * @param tickLower - The lower bound of the tick range
 * @param owner - (Optional) The user address; defaults to the calling user
 * @returns The DexPositionData object representing the user's position
 */
// export async function fetchOrCreateDexPosition(
//   ctx: GalaChainContext,
//   poolHash: string,
//   tickUpper: number,
//   tickLower: number,
//   owner?: string
// ): Promise<DexPositionData> {
//   const user = owner ?? ctx.callingUser;
//   const tickRange = genTickRange(tickLower, tickUpper);
//   const emptyUserPosition = new DexPositionOwner(user, poolHash);

//   // Fetch or initialize user's DEX position owner record
//   const fetchedUserPosition = await getObjectByKey(
//     ctx,
//     DexPositionOwner,
//     emptyUserPosition.getCompositeKey()
//   ).catch((e) => ChainError.ignore(e, ErrorCode.NOT_FOUND, emptyUserPosition));

//   await fetchedUserPosition.validateOrReject();

//   // Check if position already exists for the tick range and create a new one if it doesn't
//   let positionId = fetchedUserPosition.getPositionId(tickRange);
//   if (!positionId) {
//     const hashingString = `${user},${poolHash},${tickRange},${ctx.txUnixTime}`;
//     positionId = keccak256(hashingString);
//     fetchedUserPosition.addPosition(tickRange, positionId);
//     await putChainObject(ctx, fetchedUserPosition);

//     return new DexPositionData(poolHash, positionId, tickUpper, tickLower);
//   }

//   // Fetch and return existing position data
//   return getDexPosition(ctx, poolHash, tickUpper, tickLower, positionId);
// }


export async function fetchOrCreateDexPosition(
  ctx: GalaChainContext,
  poolHash: string,
  tickUpper: number,
  tickLower: number,
  owner?: string
): Promise<DexPositionData> {
  const user = owner ?? ctx.callingUser;
  const tickRange = genTickRange(tickLower, tickUpper);
  const emptyUserPosition = new DexPositionOwner(user, poolHash);

  // Fetch or initialize user's DEX position owner record
  const fetchedUserPosition = await getObjectByKey(
    ctx,
    DexPositionOwner,
    emptyUserPosition.getCompositeKey()
  ).catch((e) => ChainError.ignore(e, ErrorCode.NOT_FOUND, emptyUserPosition));

  await fetchedUserPosition.validateOrReject();

  // Check if position already exists for the tick range and create a new one if it doesn't
  let positionId = fetchedUserPosition.getPositionIds(tickRange);
  
  if (!positionId) {
    const hashingString = `${user},${poolHash},${tickRange},${ctx.txUnixTime}`;
    positionId = keccak256(hashingString);
    fetchedUserPosition.addPosition(tickRange, positionId);
    await putChainObject(ctx, fetchedUserPosition);

    return new DexPositionData(poolHash, positionId, tickUpper, tickLower);
  }

  // Fetch and return existing position data
  return getDexPosition(ctx, poolHash, tickUpper, tickLower, positionId);
}
