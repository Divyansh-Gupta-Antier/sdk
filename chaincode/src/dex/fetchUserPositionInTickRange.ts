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
import { DexPositionData, NotFoundError } from "@gala-chain/api";

import { GalaChainContext } from "../types";
import { genTickRange, getDexPosition, getUserPositionIds } from "../utils";

/**
 * Fetches a user's position within a specific tick range in a Dex pool.
 *
 * @param ctx - GalaChain context object.
 * @param poolHash - Identifier for the pool.
 * @param tickUpper - Upper bound of the tick range.
 * @param tickLower - Lower bound of the tick range.
 * @param owner - (Optional) Explicit user address to query; defaults to the calling user.
 * @returns DexPositionData - The position data for the specified tick range.
 * @throws NotFoundError - If the user has no position in the given tick range.
 */
export async function fetchUserPositionInTickRange(
  ctx: GalaChainContext,
  poolHash: string,
  tickUpper: number,
  tickLower: number,
  owner?: string
): Promise<DexPositionData> {
  // Fetch user positions
  const positionHolder = owner ?? ctx.callingUser;
  const tickRange = genTickRange(tickLower, tickUpper);
  const userPositions = await getUserPositionIds(ctx, positionHolder, poolHash);

  // Check if user holds any position for this tick range
  const positionId = userPositions.getPositionId(tickRange);
  if (!positionId) {
    throw new NotFoundError(`User doesnt holds any position for the tick range ${tickRange} in this pool.`);
  }

  // Fetch and return position data
  return getDexPosition(ctx, poolHash, tickUpper, tickLower, positionId);
}
