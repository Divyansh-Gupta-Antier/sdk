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
import { CollectDto, NotFoundError, Pool, UserBalanceResDto } from "@gala-chain/api";
import BigNumber from "bignumber.js";

import { fetchOrCreateBalance } from "../balances";
import { transferToken } from "../transfer";
import { GalaChainContext } from "../types";
import {
  convertToTokenInstanceKey,
  getObjectByKey,
  getTokenDecimalsFromPool,
  putChainObject,
  roundTokenAmount,
  validateTokenOrder
} from "../utils";
import { NegativeAmountError } from "./dexError";
import { fetchUserPositionInTickRange } from "./fetchUserPositionInTickRange";
import { removePositionIfEmpty } from "./removePositionIfEmpty";

/**
 * @dev The collect function allows a user to claim and withdraw accrued fee tokens from a specific liquidity position in a Decentralized exchange pool within the GalaChain ecosystem. It retrieves earned fees based on the user's position details and transfers them to the user's account.
 * @param ctx  GalaChainContext – The execution context providing access to the GalaChain environment.
 * @param dto Position details (pool information, tickUpper, tickLower).

 * @returns UserBalanceResDto
 */
export async function collect(ctx: GalaChainContext, dto: CollectDto): Promise<UserBalanceResDto> {
  const [token0, token1] = validateTokenOrder(dto.token0, dto.token1);
  const key = ctx.stub.createCompositeKey(Pool.INDEX_KEY, [token0, token1, dto.fee.toString()]);
  const pool = await getObjectByKey(ctx, Pool, key);

  const poolHash = pool.genPoolHash();
  const poolAlias = pool.getPoolAlias();
  const position = await fetchUserPositionInTickRange(ctx, poolHash, dto.tickUpper, dto.tickLower);
  if (!position) throw new NotFoundError(`User doesn't hold any positions with this tick range in this pool`);

  //create tokenInstanceKeys
  const tokenInstanceKeys = [pool.token0ClassKey, pool.token1ClassKey].map(convertToTokenInstanceKey);

  //fetch token decimals
  const tokenDecimals = await getTokenDecimalsFromPool(ctx, pool);

  const poolToken0Balance = await fetchOrCreateBalance(
    ctx,
    poolAlias,
    tokenInstanceKeys[0].getTokenClassKey()
  );
  const poolToken1Balance = await fetchOrCreateBalance(
    ctx,
    poolAlias,
    tokenInstanceKeys[1].getTokenClassKey()
  );

  const [amount0Requested, amount1Requested] = [
    BigNumber.min(dto.amount0Requested.f18(), poolToken0Balance.getQuantityTotal()),
    BigNumber.min(dto.amount1Requested.f18(), poolToken1Balance.getQuantityTotal())
  ];

  const tickLower = parseInt(dto.tickLower.toString()),
    tickUpper = parseInt(dto.tickUpper.toString());

  const amounts = pool.collect(position, tickLower, tickUpper, amount0Requested, amount1Requested);

  await removePositionIfEmpty(ctx, poolHash, position);
  await putChainObject(ctx, pool);

  for (const [index, amount] of amounts.entries()) {
    if (amount.lt(0)) {
      throw new NegativeAmountError(index, amount.toString());
    }
    const poolTokenBalance = await fetchOrCreateBalance(
      ctx,
      poolAlias,
      tokenInstanceKeys[index].getTokenClassKey()
    );
    const roundedAmount = BigNumber.min(
      roundTokenAmount(amount, tokenDecimals[index]),
      poolTokenBalance.getQuantityTotal()
    );

    await transferToken(ctx, {
      from: poolAlias,
      to: ctx.callingUser,
      tokenInstanceKey: tokenInstanceKeys[index],
      quantity: roundedAmount,
      allowancesToUse: [],
      authorizedOnBehalf: {
        callingOnBehalf: poolAlias,
        callingUser: poolAlias
      }
    });
  }
  
  const liquidityProviderToken0Balance = await fetchOrCreateBalance(
    ctx,
    ctx.callingUser,
    tokenInstanceKeys[0]
  );
  const liquidityProviderToken1Balance = await fetchOrCreateBalance(
    ctx,
    ctx.callingUser,
    tokenInstanceKeys[1]
  );
  const response = new UserBalanceResDto(liquidityProviderToken0Balance, liquidityProviderToken1Balance);
  return response;
}
