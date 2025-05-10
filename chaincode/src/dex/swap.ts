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
// import { ConflictError, Pool, SlippageToleranceExceededError, SwapDto, SwapResDto } from "@gala-chain/api";
// import BigNumber from "bignumber.js";
// import { fetchOrCreateBalance } from "../balances";
// import { fetchTokenClass } from "../token";
// import { transferToken } from "../transfer";
// import { GalaChainContext } from "../types";
// import {
//   convertToTokenInstanceKey,
//   getObjectByKey,
//   putChainObject,
//   validateTokenOrder,
// } from "../utils";
// /**
//  * @dev The swap function executes a token swap in a Decentralized exchange pool within the GalaChain ecosystem.
//  * @param ctx GalaChainContext – The execution context providing access to the GalaChain environment.
//  * @param dto SwapDto – A data transfer object containing:
//   - tokenIn – The input token being swapped.
//   - amountIn – The amount of tokenIn provided for the swap.
//   - amountInMaximum – The amount of tokenIn provided for the swap.
//   - tokenOut – The token the user wants to receive.
//   - amountOutMinimum- This amount token user want to receive Minimum;
//   - zeroForOne - Boolean value for swap direction
//   - Pool Identifiers – Identifier for the liquidity pool facilitating the swap.
//   - sqrtPriceLimit – The square root price limit to protect against excessive price impact.
//  * @returns
//  */
// export async function swap(ctx: GalaChainContext, dto: SwapDto): Promise<SwapResDto> {
//   const [token0, token1] = validateTokenOrder(dto.token0, dto.token1);
//   const zeroForOne = dto.zeroForOne;
//   const sqrtPriceLimit = dto.sqrtPriceLimit;
//   const key = ctx.stub.createCompositeKey(Pool.INDEX_KEY, [token0, token1, dto.fee.toString()]);
//   const pool = await getObjectByKey(ctx, Pool, key);
//   const amounts = pool.swap(zeroForOne, dto.amount, sqrtPriceLimit);
//   const poolAlias = pool.getPoolAlias();
//   //create tokenInstanceKeys
//   const tokenInstanceKeys = [pool.token0ClassKey, pool.token1ClassKey].map(convertToTokenInstanceKey);
//   //fetch token classes
//   const tokenClasses = await Promise.all(tokenInstanceKeys.map((key) => fetchTokenClass(ctx, key)));
//   for (const [index, amount] of amounts.entries()) {
//     if (amount.gt(0)) {
//       if (dto.amountInMaximum && amount.gt(dto.amountInMaximum)) {
//         throw new SlippageToleranceExceededError("Slippage exceeded");
//       }
//       await transferToken(ctx, {
//         from: ctx.callingUser,
//         to: poolAlias,
//         tokenInstanceKey: tokenInstanceKeys[index],
//         quantity: new BigNumber(amount.toFixed(tokenClasses[index].decimals)),
//         allowancesToUse: [],
//         authorizedOnBehalf: undefined
//       });
//     }
//     if (amount.lt(0)) {
//       if (dto.amountOutMinimum && amount.gt(dto.amountOutMinimum)) {
//         throw new SlippageToleranceExceededError("Slippage exceeded");
//       }
//       const poolTokenBalance = await fetchOrCreateBalance(
//         ctx,
//         poolAlias,
//         tokenInstanceKeys[index].getTokenClassKey()
//       );
//       if (
//         new BigNumber(amount.toFixed(tokenClasses[index].decimals))
//           .abs()
//           .gt(poolTokenBalance.getQuantityTotal())
//       ) {
//         throw new ConflictError("Not enough liquidity available in pool");
//       }
//       const roundedAmount = BigNumber.min(
//         new BigNumber(amount.toFixed(tokenClasses[index].decimals)).abs(),
//         poolTokenBalance.getQuantityTotal()
//       );
//       await transferToken(ctx, {
//         from: poolAlias,
//         to: ctx.callingUser,
//         tokenInstanceKey: tokenInstanceKeys[index],
//         quantity: roundedAmount,
//         allowancesToUse: [],
//         authorizedOnBehalf: {
//           callingOnBehalf: poolAlias,
//           callingUser: poolAlias
//         }
//       });
//     }
//   }
//   const response = new SwapResDto(
//     tokenClasses[0].symbol,
//     tokenClasses[0].image,
//     tokenClasses[1].symbol,
//     tokenClasses[1].image,
//     amounts[0].toFixed(tokenClasses[0].decimals).toString(),
//     amounts[1].toFixed(tokenClasses[1].decimals).toString(),
//     ctx.callingUser,
//     ctx.txUnixTime
//   );
//   await putChainObject(ctx, pool);
//   return response;
// }

/*
 * Copyright (c) Gala Games Inc. All rights reserved.
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use pool file except in compliance with the License.
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
  ConflictError,
  //DexPosition,
  Pool,
  SlippageToleranceExceededError,
  StepComputations,
  SwapDto,
  SwapResDto,
  SwapState,
  TickData,
  ValidationFailedError,
  computeSwapStep,
  nextInitialisedTickWithInSameWord,
  sqrtPriceToTick,
  tickCross,
  tickToSqrtPrice,
  DexPositionData
} from "@gala-chain/api";
import BigNumber from "bignumber.js";

import { fetchOrCreateBalance } from "../balances";
import { fetchTokenClass } from "../token";
import { transferToken } from "../transfer";
import { GalaChainContext } from "../types";
import { convertToTokenInstanceKey, getObjectByKey, putChainObject, validateTokenOrder } from "../utils";
import { getOrDefautTickData } from "../utils";

/**
 * @dev The swap function executes a token swap in a Uniswap V3-like liquidity pool within the GalaChain ecosystem.
 * @param ctx GalaChainContext – The execution context providing access to the GalaChain environment.
 * @param dto SwapDto – A data transfer object containing:
  - tokenIn – The input token being swapped.
  - amountIn – The amount of tokenIn provided for the swap.
  - amountInMaximum – The amount of tokenIn provided for the swap.
  - tokenOut – The token the user wants to receive.
  - amountOutMinimum- pool amount token user want to receive Minimum;
  - zeroForOne - Boolean value for swap direction
  - Pool Identifiers – Identifier for the liquidity pool facilitating the swap.
  - sqrtPriceLimit – The square root price limit to protect against excessive price impact.
 * @returns 
 */
export async function swap(ctx: GalaChainContext, dto: SwapDto): Promise<SwapResDto> {
  const [token0, token1] = validateTokenOrder(dto.token0, dto.token1);
  const zeroForOne = dto.zeroForOne;
  const sqrtPriceLimit = dto.sqrtPriceLimit;

  const key = ctx.stub.createCompositeKey(Pool.INDEX_KEY, [token0, token1, dto.fee.toString()]);
  const pool = await getObjectByKey(ctx, Pool, key);

  //If pool does not exist
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

    //cap the tick in valid range i.e. MIN_TICK < tick < MAX_TICK
    if (step.tickNext < DexPositionData.MIN_TICK  || step.tickNext > DexPositionData.MAX_TICK) {
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
        const tickData = await getOrDefautTickData(ctx, poolHash, step.tickNext);
        let liquidityNet = tickCross(
          step.tickNext,
          tickData,
          zeroForOne ? state.feeGrowthGlobalX : pool.feeGrowthGlobal0,
          zeroForOne ? pool.feeGrowthGlobal1 : state.feeGrowthGlobalX
        );
        await putChainObject(ctx, tickData[step.tickNext]);
        if (zeroForOne) liquidityNet = liquidityNet.times(-1);
        state.liquidity = state.liquidity.plus(liquidityNet);
      }
      state.tick = zeroForOne ? step.tickNext - 1 : step.tickNext;
    } else if (state.sqrtPrice != step.sqrtPriceStart) {
      state.tick = sqrtPriceToTick(state.sqrtPrice);
    }
  }

  const amounts = pool.swapN(zeroForOne, state, amountSpecified);
  const poolAlias = pool.getPoolAlias();

  //create tokenInstanceKeys
  const tokenInstanceKeys = [pool.token0ClassKey, pool.token1ClassKey].map(convertToTokenInstanceKey);

  //fetch token classes
  const tokenClasses = await Promise.all(tokenInstanceKeys.map((key) => fetchTokenClass(ctx, key)));

  for (const [index, amount] of amounts.entries()) {
    if (amount.gt(0)) {
      if (dto.amountInMaximum && amount.gt(dto.amountInMaximum)) {
        throw new SlippageToleranceExceededError("Slippage exceeded");
      }

      await transferToken(ctx, {
        from: ctx.callingUser,
        to: poolAlias,
        tokenInstanceKey: tokenInstanceKeys[index],
        quantity: new BigNumber(amount.toFixed(tokenClasses[index].decimals)),
        allowancesToUse: [],
        authorizedOnBehalf: undefined
      });
    }
    if (amount.lt(0)) {
      if (dto.amountOutMinimum && amount.gt(dto.amountOutMinimum)) {
        throw new SlippageToleranceExceededError("Slippage exceeded");
      }

      const poolTokenBalance = await fetchOrCreateBalance(
        ctx,
        poolAlias,
        tokenInstanceKeys[index].getTokenClassKey()
      );
      const roundedAmount = BigNumber.min(
        new BigNumber(amount.toFixed(tokenClasses[index].decimals)).abs(),
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
  }

  const response = new SwapResDto(
    tokenClasses[0].symbol,
    tokenClasses[0].image,
    tokenClasses[1].symbol,
    tokenClasses[1].image,
    amounts[0].toFixed(tokenClasses[0].decimals).toString(),
    amounts[1].toFixed(tokenClasses[1].decimals).toString(),
    ctx.callingUser,
    ctx.txUnixTime
  );

  await putChainObject(ctx, pool);
  return response;
}



// public swap(
        //   zeroForOne: boolean,
        //   amountSpecified: BigNumber,
        //   sqrtPriceLimit: BigNumber
        // ): [amount0: BigNumber, amount1: BigNumber] {
        //   // Input amount to swap
        //   if (amountSpecified.isEqualTo(0)) throw new ValidationFailedError("Invalid specified amount");
        //   //Check for the validity of sqrtPriceLimit
        //   if (zeroForOne) {
        //     if (
        //       !(
        //         sqrtPriceLimit.isLessThan(this.sqrtPrice) &&
        //         sqrtPriceLimit.isGreaterThan(new BigNumber("0.000000000000000000054212146"))
        //       )
        //     )
        //       throw new SlippageToleranceExceededError("SquarePriceLImit exceeds limit");
        //   } else {
        //     if (
        //       !(
        //         sqrtPriceLimit.isGreaterThan(this.sqrtPrice) &&
        //         sqrtPriceLimit.isLessThan(new BigNumber("18446051000000000000"))
        //       )
        //     )
        //       throw new SlippageToleranceExceededError("SquarePriceLImit exceeds limit");
        //   }
      
        //   const slot0 = {
        //     sqrtPrice: new BigNumber(this.sqrtPrice),
        //     tick: sqrtPriceToTick(this.sqrtPrice),
        //     liquidity: new BigNumber(this.liquidity)
        //   };
      
        //   const state: SwapState = {
        //     amountSpecifiedRemaining: amountSpecified,
        //     amountCalculated: new BigNumber(0),
        //     sqrtPrice: new BigNumber(this.sqrtPrice),
        //     tick: slot0.tick,
        //     liquidity: new BigNumber(slot0.liquidity),
        //     feeGrowthGlobalX: zeroForOne ? this.feeGrowthGlobal0 : this.feeGrowthGlobal1,
        //     protocolFee: new BigNumber(0)
        //   };
      
        //   const exactInput = amountSpecified.isGreaterThan(0);
      
        //   //swap till the amount specified for the swap is completely exhausted
        //   while (!state.amountSpecifiedRemaining.isEqualTo(0) && !state.sqrtPrice.isEqualTo(sqrtPriceLimit)) {
        //     const step: StepComputations = {
        //       sqrtPriceStart: state.sqrtPrice,
        //       tickNext: 0,
        //       sqrtPriceNext: BigNumber(0),
        //       initialised: false,
        //       amountOut: BigNumber(0),
        //       amountIn: BigNumber(0),
        //       feeAmount: BigNumber(0)
        //     };
      
        //     [step.tickNext, step.initialised] = nextInitialisedTickWithInSameWord(
        //       this.bitmap,
        //       state.tick,
        //       this.tickSpacing,
        //       zeroForOne,
        //       state.sqrtPrice
        //     );
      
        //     //cap the tick in valid range i.e. MIN_TICK < tick < MAX_TICK
        //     if (step.tickNext < DexPositionData.MIN_TICK || step.tickNext > DexPositionData.MAX_TICK) {
        //       throw new ConflictError("Not enough liquidity available in pool");
        //     }
      
        //     //price at next tick
        //     step.sqrtPriceNext = tickToSqrtPrice(step.tickNext);
        //     [state.sqrtPrice, step.amountIn, step.amountOut, step.feeAmount] = computeSwapStep(
        //       state.sqrtPrice,
        //       (
        //         zeroForOne
        //           ? step.sqrtPriceNext.isLessThan(sqrtPriceLimit)
        //           : step.sqrtPriceNext.isGreaterThan(sqrtPriceLimit)
        //       )
        //         ? sqrtPriceLimit
        //         : step.sqrtPriceNext,
        //       state.liquidity,
        //       state.amountSpecifiedRemaining,
        //       this.fee
        //     );
        //     if (exactInput) {
        //       state.amountSpecifiedRemaining = state.amountSpecifiedRemaining.minus(
        //         step.amountIn.plus(step.feeAmount)
        //       );
        //       state.amountCalculated = state.amountCalculated.minus(step.amountOut);
        //     } else {
        //       state.amountSpecifiedRemaining = state.amountSpecifiedRemaining.plus(step.amountOut);
        //       state.amountCalculated = state.amountCalculated.plus(step.amountIn.plus(step.feeAmount));
        //     }
      
        //     // if protocl fee is on, calculate how much is owed, decrement feeAmount and increment protocolFee
        //     if (this.protocolFees > 0) {
        //       const delta = step.feeAmount.multipliedBy(new BigNumber(this.protocolFees));
        //       step.feeAmount = step.feeAmount.minus(delta);
        //       state.protocolFee = state.protocolFee.plus(delta);
        //     }
      
        //     // Update Global fee tracker
        //     if (state.liquidity.isGreaterThan(0))
        //       state.feeGrowthGlobalX = state.feeGrowthGlobalX.plus(step.feeAmount.dividedBy(state.liquidity));
      
        //     if (state.sqrtPrice == step.sqrtPriceNext) {
        //       if (step.initialised) {
        //         let liquidityNet = tickCross(
        //           step.tickNext,
        //           this.tickData,
        //           zeroForOne ? state.feeGrowthGlobalX : this.feeGrowthGlobal0,
        //           zeroForOne ? this.feeGrowthGlobal1 : state.feeGrowthGlobalX
        //         );
        //         if (zeroForOne) liquidityNet = liquidityNet.times(-1);
        //         state.liquidity = state.liquidity.plus(liquidityNet);
        //       }
        //       state.tick = zeroForOne ? step.tickNext - 1 : step.tickNext;
        //     } else if (state.sqrtPrice != step.sqrtPriceStart) {
        //       state.tick = sqrtPriceToTick(state.sqrtPrice);
        //     }
        //   }
      
        //   // update to new price
        //   this.sqrtPrice = state.sqrtPrice;
      
        //   // Updating global liquidity
        //   if (this.liquidity != state.liquidity) this.liquidity = state.liquidity;
      
        //   // Update fee growth global
        //   if (zeroForOne) {
        //     this.feeGrowthGlobal0 = state.feeGrowthGlobalX;
        //     if (state.protocolFee.gt(new BigNumber(0)))
        //       this.protocolFeesToken0 = this.protocolFeesToken0.plus(state.protocolFee);
        //   } else {
        //     this.feeGrowthGlobal1 = state.feeGrowthGlobalX;
        //     if (state.protocolFee.gt(new BigNumber(0)))
        //       this.protocolFeesToken1 = this.protocolFeesToken1.plus(state.protocolFee);
        //   }
      
        //   const amount0: BigNumber =
        //     zeroForOne == exactInput
        //       ? new BigNumber(amountSpecified).minus(state.amountSpecifiedRemaining)
        //       : state.amountCalculated;
        //   const amount1: BigNumber =
        //     zeroForOne == exactInput
        //       ? new BigNumber(state.amountCalculated)
        //       : new BigNumber(amountSpecified).minus(state.amountSpecifiedRemaining);
      
        //   return [amount0, amount1];
        // }