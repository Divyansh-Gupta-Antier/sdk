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
  DexFeeConfig,
  DexPosition,
  ErrorCode,
  Pool,
  TokenClassKey,
  TokenInstanceKey,
  ValidationFailedError
} from "@gala-chain/api";
import BigNumber from "bignumber.js";

import { GalaChainContext } from "../types";
import { getObjectByKey } from "./state";

/**
 *
 * @param arr It will sort array for string
 * @returns It will return modified array with sorted according to lexiographical order
 */
export const sortString = (arr: string[]) => {
  const sortedArr = [...arr].sort((a, b) => a.localeCompare(b));
  const isChanged = !arr.every((val, index) => val === sortedArr[index]);

  return { sortedArr, isChanged };
};

/**
 *
 * @param arr Array Element
 * @param idx Element1 to swap
 * @param idx2 Element2 to swap
 */
export const swapAmounts = (arr: string[] | BigNumber[], idx = 0, idx2 = 1) => {
  const temp = arr[idx];
  arr[idx] = arr[idx2];
  arr[idx2] = temp;
};

/**
 * @dev it will round down the Bignumber to 18 decimals
 * @param BN
 * @param round
 * @returns
 */
export const f18 = (BN: BigNumber, round: BigNumber.RoundingMode = BigNumber.ROUND_DOWN): BigNumber =>
  new BigNumber(BN.toFixed(18, round));

export const generateKeyFromClassKey = (obj: TokenClassKey) => {
  return Object.assign(new TokenClassKey(), obj).toStringKey().replace(/\|/g, ":") || "";
};

export function convertToTokenInstanceKey(tokenClassKey: TokenClassKey): TokenInstanceKey {
  return Object.assign(new TokenInstanceKey(), {
    collection: tokenClassKey.collection,
    category: tokenClassKey.category,
    type: tokenClassKey.type,
    additionalKey: tokenClassKey.additionalKey,
    instance: new BigNumber(0)
  });
}

export function validateTokenOrder(token0: TokenClassKey, token1: TokenClassKey) {
  const [normalizedToken0, normalizedToken1] = [token0, token1].map(generateKeyFromClassKey);

  if (normalizedToken0.localeCompare(normalizedToken1) > 0) {
    throw new ValidationFailedError("Token0 must be smaller");
  } else if (normalizedToken0.localeCompare(normalizedToken1) === 0) {
    throw new ValidationFailedError(
      `Cannot create pool of same tokens. Token0 ${JSON.stringify(token0)} and Token1 ${JSON.stringify(
        token1
      )} must be different.`
    );
  }
  return [normalizedToken0, normalizedToken1];
}

export function genNftId(...params: string[] | number[]): string {
  return params.join("$");
}

export function genBookMark(...params: string[] | number[]): string {
  return params.join("|");
}

export function splitBookmark(bookmark = "") {
  const [chainBookmark = "", localBookmark = "0"] = bookmark.split("|");
  return { chainBookmark, localBookmark };
}

/**
 * Parses an NFT ID string into its batch number and instance ID components.
 *
 * @param nftId The NFT ID in the format 'batchNumber_instanceId'
 * @returns An object containing the batchNumber and instanceId as BigNumber
 * @throws ValidationFailedError if the input format is invalid
 */
export function parseNftId(nftId: string): { batchNumber: string; instanceId: BigNumber } {
  const parts = nftId.split("$");
  if (parts.length !== 2) {
    throw new ValidationFailedError("Invalid NFT ID format. Expected format: 'batchNumber$instanceId'.");
  }
  return {
    batchNumber: parts[0],
    instanceId: new BigNumber(parts[1])
  };
}

export async function fetchDexProtocolFeeConfig(ctx: GalaChainContext): Promise<DexFeeConfig | undefined> {
  const key = ctx.stub.createCompositeKey(DexFeeConfig.INDEX_KEY, []);

  const dexConfig = await getObjectByKey(ctx, DexFeeConfig, key).catch((e) => {
    const chainError = ChainError.from(e);
    if (chainError.matches(ErrorCode.NOT_FOUND)) {
      return undefined;
    } else {
      throw chainError;
    }
  });

  return dexConfig;
}

/**
 * Fetches the DexPosition for a given pool and NFT ID.
 *
 * @param ctx - The GalaChain context used to access the blockchain state.
 * @param pool - The pool object used to generate the pool hash.
 * @param nftId - The NFT ID used to identify the position.
 * @param throwIfNotFound - Optional flag; if true, throws an error when the position is not found.
 * @returns A DexPosition object if found, or undefined if not found (unless throwIfNotFound is true).
 */
export async function fetchDexPosition(
  ctx: GalaChainContext,
  pool: Pool,
  nftId: string
): Promise<DexPosition> {
  const poolHash = pool.genPoolHash();
  const position = await getObjectByKey(
    ctx,
    DexPosition,
    ctx.stub.createCompositeKey(DexPosition.INDEX_KEY, [poolHash, nftId])
  );

  return position;
}
