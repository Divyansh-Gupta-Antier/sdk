import { DexPositionData } from '@gala-chain/api';
// /*
//  * Copyright (c) Gala Games Inc. All rights reserved.
//  * Licensed under the Apache License, Version 2.0 (the "License");
//  * you may not use this file except in compliance with the License.
//  * You may obtain a copy of the License at
//  *
//  *     http://www.apache.org/licenses/LICENSE-2.0
//  *
//  * Unless required by applicable law or agreed to in writing, software
//  * distributed under the License is distributed on an "AS IS" BASIS,
//  * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//  * See the License for the specific language governing permissions and
//  * limitations under the License.
//  */
// import { NotFoundError, Pool, QuoteExactAmountDto, QuoteExactAmountResDto } from "@gala-chain/api";
// import BigNumber from "bignumber.js";

// import { GalaChainContext } from "../types";
// import { getObjectByKey, validateTokenOrder } from "../utils";

// /**
//  * @dev The quoteExactAmount function calculates the required amount of the other token for a swap or liquidity addition in a Decentralized exchange pool within the GalaChain ecosystem.
//  * @param ctx GalaChainContext – The execution context providing access to the GalaChain environment.
//  * @param dto QuoteExactAmountDto – A data transfer object containing:
//   - Input token details – Specifies which token and amount are being provided.
//   - Trade direction – Determines whether the quote is for token0 → token1 or token1 → token0.
//   -  Pool state parameters – Includes information such as current tick and fee tier
//  * @returns Promise<{ amount0: string; amount1: string; sqrtPriceLimit: string }> – A response object containing:
//   - amount0 – The calculated amount of token0 required for the trade.
//   - amount1 – The calculated amount of token1 required for the trade.
//   - sqrtPriceLimit – The square root price limit after the swap or liquidity operation.
//  */
// export async function quoteExactAmount(
//   ctx: GalaChainContext,
//   dto: QuoteExactAmountDto
// ): Promise<QuoteExactAmountResDto> {
//   const [token0, token1] = validateTokenOrder(dto.token0, dto.token1);

//   const zeroForOne = dto.zeroForOne;

//   const key = ctx.stub.createCompositeKey(Pool.INDEX_KEY, [token0, token1, dto.fee.toString()]);
//   const pool = await getObjectByKey(ctx, Pool, key);

//   const currentSqrtPrice = pool.sqrtPrice;
//   const amounts = pool.swap(
//     zeroForOne,
//     dto.amount.f18(),
//     zeroForOne ? new BigNumber("0.000000000000000000054212147") : new BigNumber("18446050999999999999")
//   );
//   const newSqrtPrice = pool.sqrtPrice;
//   return new QuoteExactAmountResDto(amounts[0], amounts[1], currentSqrtPrice, newSqrtPrice);
// }


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
import { computeSwapStep, ConflictError, nextInitialisedTickWithInSameWord, NotFoundError, Pool, QuoteExactAmountDto, QuoteExactAmountResDto, SlippageToleranceExceededError, sqrtPriceToTick, StepComputations, SwapState, tickCross, tickToSqrtPrice, ValidationFailedError } from "@gala-chain/api";
import BigNumber from "bignumber.js";

import { GalaChainContext } from "../types";
import { getObjectByKey, validateTokenOrder } from "../utils";
// import { getOrDefautTickData } from "./tickData.helper";
import { getOrDefautTickData } from "../utils";

/**
 * @dev The quoteExactAmount function calculates the required amount of the other token for a swap or liquidity addition in a Uniswap V3 pool within the GalaChain ecosystem.
 * @param ctx GalaChainContext – The execution context providing access to the GalaChain environment.
 * @param dto QuoteExactAmountDto – A data transfer object containing:
  - Input token details – Specifies which token and amount are being provided.
  - Trade direction – Determines whether the quote is for token0 → token1 or token1 → token0.
  -  Pool state parameters – Includes information such as current tick and fee tier
 * @returns Promise<{ amount0: string; amount1: string; sqrtPriceLimit: string }> – A response object containing:
  - amount0 – The calculated amount of token0 required for the trade.
  - amount1 – The calculated amount of token1 required for the trade.
  - sqrtPriceLimit – The square root price limit after the swap or liquidity operation.
 */
export async function quoteExactAmount(
  ctx: GalaChainContext,
  dto: QuoteExactAmountDto
): Promise<QuoteExactAmountResDto> {
  const [token0, token1] = validateTokenOrder(dto.token0, dto.token1);

  const zeroForOne = dto.zeroForOne;

  const key = ctx.stub.createCompositeKey(Pool.INDEX_KEY, [token0, token1, dto.fee.toString()]);
  const pool = await getObjectByKey(ctx, Pool, key);
  if (pool == undefined) throw new NotFoundError("Pool does not exist");
  const sqrtPriceLimit =  zeroForOne ? new BigNumber("0.000000000000000000054212147") : new BigNumber("18446050999999999999")
  const currentSqrtPrice = pool.sqrtPrice;
  const poolHash = pool.genPoolHash();

  if (zeroForOne) {
    if (
      !(
        sqrtPriceLimit.isLessThan(pool.sqrtPrice) &&
        sqrtPriceLimit.isGreaterThan(new BigNumber("0.000000000000000000054212146"))
      )
    )
      throw new SlippageToleranceExceededError("SquarePriceLImit exceeds limit");
  } else {
    if (
      !(
        sqrtPriceLimit.isGreaterThan(pool.sqrtPrice) &&
        sqrtPriceLimit.isLessThan(new BigNumber("18446051000000000000"))
      )
    )
      throw new SlippageToleranceExceededError("SquarePriceLImit exceeds limit");
  }
  let amountSpecified = dto.amount;

   if (amountSpecified.isEqualTo(0)) throw new ValidationFailedError("Invalid specified amount");

  const slot0 = {
    sqrtPrice: new BigNumber(pool.sqrtPrice),
    tick: sqrtPriceToTick(pool.sqrtPrice),
    liquidity: new BigNumber(pool.liquidity)
  };

  const state: SwapState = {
    amountSpecifiedRemaining: amountSpecified,
    amountCalculated: new BigNumber(0),
    sqrtPrice: new BigNumber(pool.sqrtPrice),
    tick: slot0.tick,
    liquidity: new BigNumber(slot0.liquidity),
    feeGrowthGlobalX: zeroForOne ? pool.feeGrowthGlobal0 : pool.feeGrowthGlobal1,
    protocolFee: new BigNumber(0)
  };

  const exactInput = amountSpecified.isGreaterThan(0);

  //swap till the amount specified for the swap is completely exhausted
  while (!state.amountSpecifiedRemaining.isEqualTo(0) && !state.sqrtPrice.isEqualTo(sqrtPriceLimit)) {
    const step: StepComputations = {
      sqrtPriceStart: state.sqrtPrice,
      tickNext: 0,
      sqrtPriceNext: BigNumber(0),
      initialised: false,
      amountOut: BigNumber(0),
      amountIn: BigNumber(0),
      feeAmount: BigNumber(0)
    };

    [step.tickNext, step.initialised] = nextInitialisedTickWithInSameWord(
      pool.bitmap,
      state.tick,
      pool.tickSpacing,
      zeroForOne,
      state.sqrtPrice
    );
    let tickData = {};
    //cap the tick in valid range i.e. MIN_TICK < tick < MAX_TICK
    if (step.tickNext < DexPositionData.MIN_TICK || step.tickNext > DexPositionData.MAX_TICK) {
      throw new ConflictError("Not enough liquidity available in pool");
    }

    //price at next tick
    step.sqrtPriceNext = tickToSqrtPrice(step.tickNext);
    [state.sqrtPrice, step.amountIn, step.amountOut, step.feeAmount] = computeSwapStep(
      state.sqrtPrice,
      (
        zeroForOne
          ? step.sqrtPriceNext.isLessThan(sqrtPriceLimit)
          : step.sqrtPriceNext.isGreaterThan(sqrtPriceLimit)
      )
        ? sqrtPriceLimit
        : step.sqrtPriceNext,
      state.liquidity,
      state.amountSpecifiedRemaining,
      pool.fee
    );
    if (exactInput) {
      state.amountSpecifiedRemaining = state.amountSpecifiedRemaining.minus(
        step.amountIn.plus(step.feeAmount)
      );
      state.amountCalculated = state.amountCalculated.minus(step.amountOut);
    } else {
      state.amountSpecifiedRemaining = state.amountSpecifiedRemaining.plus(step.amountOut);
      state.amountCalculated = state.amountCalculated.plus(step.amountIn.plus(step.feeAmount));
    }

    // if protocl fee is on, calculate how much is owed, decrement feeAmount and increment protocolFee
    if (pool.protocolFees > 0) {
      const delta = step.feeAmount.multipliedBy(new BigNumber(pool.protocolFees));
      step.feeAmount = step.feeAmount.minus(delta);
      state.protocolFee = state.protocolFee.plus(delta);
    }

    // Update Global fee tracker
    if (state.liquidity.isGreaterThan(0))
      state.feeGrowthGlobalX = state.feeGrowthGlobalX.plus(step.feeAmount.dividedBy(state.liquidity));

    if (state.sqrtPrice == step.sqrtPriceNext) {
      if (step.initialised) {
        if(!tickData[step.tickNext]) {
          tickData  = {...tickData, ...(await getOrDefautTickData(ctx, poolHash,step.tickNext))}
        }
        let liquidityNet = tickCross(
          step.tickNext,
          tickData,
          zeroForOne ? state.feeGrowthGlobalX : pool.feeGrowthGlobal0,
          zeroForOne ? pool.feeGrowthGlobal1 : state.feeGrowthGlobalX
        );
        // await putChainObject(ctx,tickData[step.tickNext]);
        if (zeroForOne) liquidityNet = liquidityNet.times(-1);
        state.liquidity = state.liquidity.plus(liquidityNet);
      }
      state.tick = zeroForOne ? step.tickNext - 1 : step.tickNext;
    } else if (state.sqrtPrice != step.sqrtPriceStart) {
      state.tick = sqrtPriceToTick(state.sqrtPrice);
    }
  }

  const amounts = pool.swapN(zeroForOne, state, amountSpecified);
  // const amounts = pool.swap(
  //   zeroForOne,
  //   dto.amount.f18(),
  //  sqrtPriceLimit
  // );
  const newSqrtPrice = pool.sqrtPrice;
  return new QuoteExactAmountResDto(amounts[0], amounts[1], currentSqrtPrice, newSqrtPrice);
}