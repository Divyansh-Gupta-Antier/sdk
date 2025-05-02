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
import BigNumber from "bignumber.js";
import { Exclude, Type } from "class-transformer";
import { IsNumber, IsString, ValidateNested } from "class-validator";
import { JSONSchema } from "class-validator-jsonschema";
import { keccak256 } from "js-sha3";

import {
  Bitmap,
  ChainKey,
  ConflictError,
  SlippageToleranceExceededError,
  StepComputations,
  SwapState,
  TickData,
  TickDataObj,
  ValidationFailedError,
  checkTicks,
  computeSwapStep,
  feeAmountTickSpacing,
  flipTick,
  getAmount0Delta,
  getAmount1Delta,
  getFeeGrowthInside,
  liquidity0,
  liquidity1,
  nextInitialisedTickWithInSameWord,
  requirePosititve,
  sqrtPriceToTick,
  tickCross,
  tickSpacingToMaxLiquidityPerTick,
  tickToSqrtPrice,
  updateTick
} from "../utils";
import { BigNumberProperty } from "../validators";
import { ChainObject } from "./ChainObject";
import { DexPositionData } from "./DexPositionData";
import { TokenClassKey } from "./TokenClass";

@JSONSchema({
  description: "Uniswap V3 pool chain object with the core contract functionality."
})
export class Pool extends ChainObject {
  @Exclude()
  static INDEX_KEY = "GCDVP"; //GalaChain Dex V3 Pool

  @ChainKey({ position: 0 })
  @IsString()
  public readonly token0: string;

  @ChainKey({ position: 1 })
  @IsString()
  public readonly token1: string;

  @ChainKey({ position: 2 })
  @IsNumber()
  public readonly fee: number;

  @ValidateNested()
  @Type(() => TokenClassKey)
  public readonly token0ClassKey: TokenClassKey;

  @ValidateNested()
  @Type(() => TokenClassKey)
  public readonly token1ClassKey: TokenClassKey;

  @ValidateNested()
  @Type(() => Bitmap)
  public bitmap: Bitmap;

  @ValidateNested()
  @Type(() => TickData)
  public tickData: TickDataObj;

  @BigNumberProperty()
  public sqrtPrice: BigNumber;

  @BigNumberProperty()
  public liquidity: BigNumber;

  @BigNumberProperty()
  public feeGrowthGlobal0: BigNumber;

  @BigNumberProperty()
  public feeGrowthGlobal1: BigNumber;

  @BigNumberProperty()
  public maxLiquidityPerTick: BigNumber;

  @IsNumber()
  public tickSpacing: number;

  @IsNumber()
  public protocolFees: number;

  @BigNumberProperty()
  public protocolFeesToken0: BigNumber;

  @BigNumberProperty()
  public protocolFeesToken1: BigNumber;

  /**
   * @dev Creates and initializes a new Pool with a given sqrtPrice.
   * @param token0 TokenKey0 used to create a composite key for the pool.
   * @param token1 TokenKey1 used to create a composite key for the pool.
   * @param token0ClassKey Token class key to identify token0.
   * @param token1ClassKey Token class key to identify token1.
   * @param fee Fee parameter that determines the pool's fee structure and tick spacing.
   * @param initialSqrtPrice Initial square root price for the V3 pool.
   */
  constructor(
    token0: string,
    token1: string,
    token0ClassKey: TokenClassKey,
    token1ClassKey: TokenClassKey,
    fee: number,
    initialSqrtPrice: BigNumber,
    protocolFees = 0
  ) {
    super();
    this.token0 = token0;
    this.token1 = token1;
    this.token0ClassKey = token0ClassKey;
    this.token1ClassKey = token1ClassKey;
    this.fee = fee;
    this.bitmap = {};
    this.tickData = {};
    this.sqrtPrice = initialSqrtPrice;
    this.liquidity = new BigNumber(0);
    this.feeGrowthGlobal0 = new BigNumber(0);
    this.feeGrowthGlobal1 = new BigNumber(0);
    this.tickSpacing = feeAmountTickSpacing[fee];
    this.maxLiquidityPerTick = tickSpacingToMaxLiquidityPerTick(this.tickSpacing);

    if (this.protocolFees < 0 || this.protocolFees > 1) {
      throw new ValidationFailedError("Protocol Fees out of bounds");
    }
    this.protocolFees = protocolFees;
    this.protocolFeesToken0 = new BigNumber(0);
    this.protocolFeesToken1 = new BigNumber(0);
  }

  /**
   * @dev Effect some changes to a position
   * @param position The Dex position that is being updated here
   * @param tickLower lower tick of the position's tick range
   * @param tickUpper upper tick of the position's tick range
   * @param liquidityDelata The amount of liquidity to change in the position
   * @return amount0 the amount of token0 owed to the pool, negative if the pool should pay the recipient
   * @return amount1 the amount of token1 owed to the pool, negative if the pool should pay the recipient
   */
  private _modifyPosition(
    position: DexPositionData,
    tickLower: number,
    tickUpper: number,
    liquidityDelta: BigNumber
  ): BigNumber[] {
    //tick to Price
    const sqrtPriceLower = tickToSqrtPrice(tickLower);
    const sqrtPriceUpper = tickToSqrtPrice(tickUpper);
    const tickCurrent = sqrtPriceToTick(this.sqrtPrice);

    // Common checks for valid tick input
    checkTicks(tickLower, tickUpper);

    this._updatePosition(position, tickLower, tickUpper, liquidityDelta, tickCurrent);

    //amounts of tokens required to provided given liquidity
    let amount0Req = new BigNumber(0),
      amount1Req = new BigNumber(0);

    if (!liquidityDelta.isEqualTo(0)) {
      //current tick is below the desired range
      if (this.sqrtPrice.isLessThan(sqrtPriceLower))
        amount0Req = getAmount0Delta(sqrtPriceLower, sqrtPriceUpper, liquidityDelta);
      //current tick is in the desired range
      else if (this.sqrtPrice.isLessThan(sqrtPriceUpper)) {
        amount0Req = getAmount0Delta(this.sqrtPrice, sqrtPriceUpper, liquidityDelta);
        amount1Req = getAmount1Delta(sqrtPriceLower, this.sqrtPrice, liquidityDelta);
        //liquidity is added to the active liquidity
        this.liquidity = this.liquidity.plus(liquidityDelta);
        requirePosititve(this.liquidity);
      }
      //current tick is above the desired range
      else amount1Req = getAmount1Delta(sqrtPriceLower, sqrtPriceUpper, liquidityDelta);
    }
    return [amount0Req, amount1Req];
  }

  /**
   * @dev Gets and updates a position with the given liquidity delta
   * @param position The Dex position that is being updated here
   * @param tickLower the lower tick of the position's tick range
   * @param tickUpper the upper tick of the position's tick range
   * @param tickCurrent the current tick
   */

  public _updatePosition(
    position: DexPositionData,
    tickLower: number,
    tickUpper: number,
    liquidityDelta: BigNumber,
    tickCurrent: number
  ) {
    if (!liquidityDelta.isEqualTo(0)) {
      //update ticks
      const flippedLower = updateTick(
        this.tickData,
        tickLower,
        tickCurrent,
        liquidityDelta,
        false,
        this.feeGrowthGlobal0,
        this.feeGrowthGlobal1,
        this.maxLiquidityPerTick
      );
      const flippedUpper = updateTick(
        this.tickData,
        tickUpper,
        tickCurrent,
        liquidityDelta,
        true,
        this.feeGrowthGlobal0,
        this.feeGrowthGlobal1,
        this.maxLiquidityPerTick
      );

      //flip ticks if needed
      if (flippedLower) flipTick(this.bitmap, tickLower, this.tickSpacing);
      if (flippedUpper) flipTick(this.bitmap, tickUpper, this.tickSpacing);
    }

    //calculate fee growth inside the range
    const [feeGrowthInside0, feeGrowthInside1] = getFeeGrowthInside(
      this.tickData,
      tickLower,
      tickUpper,
      tickCurrent,
      this.feeGrowthGlobal0,
      this.feeGrowthGlobal1
    );

    //Update position
    position.updatePosition(liquidityDelta, feeGrowthInside0, feeGrowthInside1);
  }

  /**
   * @notice Adds liquidity for the given recipient/tickLower/tickUpper position
   * @param position The Dex position that is being updated here
   * @param tickLower The lower tick of the position in which to add liquidity
   * @param tickUpper The upper tick of the position in which to add liquidity
   * @param liquidity The amount of liquidity to mint
   * @return amount0 The amount of token0 that was paid to mint the given amount of liquidity
   * @return amount1 The amount of token1 that was paid to mint the given amount of liquidity
   */
  public mint(
    position: DexPositionData,
    tickLower: number,
    tickUpper: number,
    liquidity: BigNumber
  ): BigNumber[] {
    if (liquidity.isEqualTo(0)) throw new ValidationFailedError("Invalid Liquidity");

    const [amount0Req, amount1Req] = this._modifyPosition(position, tickLower, tickUpper, liquidity);

    return [amount0Req, amount1Req];
  }

  /**
   * @notice Swap token0 for token1, or token1 for token0
   * @param recipient The address to receive the output of the swap
   * @param zeroForOne The direction of the swap, true for token0 to token1, false for token1 to token0
   * @param amountSpecified The amount of the swap, which implicitly configures the swap as exact input (positive), or exact output (negative)
   * @param sqrtPriceLimit sqrt price limit. If zero for one, the price cannot be less than this value after the swap. If one for zero, the price cannot be greater than this value after the swap
   * @return amount0 The delta of the balance of token0 of the pool, exact when negative, minimum when positive
   * @return amount1 The delta of the balance of token1 of the pool, exact when negative, minimum when positive
   */
  public swap(
    zeroForOne: boolean,
    amountSpecified: BigNumber,
    sqrtPriceLimit: BigNumber
  ): [amount0: BigNumber, amount1: BigNumber] {
    // Input amount to swap
    if (amountSpecified.isEqualTo(0)) throw new ValidationFailedError("Invalid specified amount");
    //Check for the validity of sqrtPriceLimit
    if (zeroForOne) {
      if (
        !(
          sqrtPriceLimit.isLessThan(this.sqrtPrice) &&
          sqrtPriceLimit.isGreaterThan(new BigNumber("0.000000000000000000054212146"))
        )
      )
        throw new SlippageToleranceExceededError("SquarePriceLImit exceeds limit");
    } else {
      if (
        !(
          sqrtPriceLimit.isGreaterThan(this.sqrtPrice) &&
          sqrtPriceLimit.isLessThan(new BigNumber("18446051000000000000"))
        )
      )
        throw new SlippageToleranceExceededError("SquarePriceLImit exceeds limit");
    }

    const slot0 = {
      sqrtPrice: new BigNumber(this.sqrtPrice),
      tick: sqrtPriceToTick(this.sqrtPrice),
      liquidity: new BigNumber(this.liquidity)
    };

    const state: SwapState = {
      amountSpecifiedRemaining: amountSpecified,
      amountCalculated: new BigNumber(0),
      sqrtPrice: new BigNumber(this.sqrtPrice),
      tick: slot0.tick,
      liquidity: new BigNumber(slot0.liquidity),
      feeGrowthGlobalX: zeroForOne ? this.feeGrowthGlobal0 : this.feeGrowthGlobal1,
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
        this.bitmap,
        state.tick,
        this.tickSpacing,
        zeroForOne,
        state.sqrtPrice
      );

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
        this.fee
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
      if (this.protocolFees > 0) {
        const delta = step.feeAmount.multipliedBy(new BigNumber(this.protocolFees));
        step.feeAmount = step.feeAmount.minus(delta);
        state.protocolFee = state.protocolFee.plus(delta);
      }

      // Update Global fee tracker
      if (state.liquidity.isGreaterThan(0))
        state.feeGrowthGlobalX = state.feeGrowthGlobalX.plus(step.feeAmount.dividedBy(state.liquidity));

      if (state.sqrtPrice == step.sqrtPriceNext) {
        if (step.initialised) {
          let liquidityNet = tickCross(
            step.tickNext,
            this.tickData,
            zeroForOne ? state.feeGrowthGlobalX : this.feeGrowthGlobal0,
            zeroForOne ? this.feeGrowthGlobal1 : state.feeGrowthGlobalX
          );
          if (zeroForOne) liquidityNet = liquidityNet.times(-1);
          state.liquidity = state.liquidity.plus(liquidityNet);
        }
        state.tick = zeroForOne ? step.tickNext - 1 : step.tickNext;
      } else if (state.sqrtPrice != step.sqrtPriceStart) {
        state.tick = sqrtPriceToTick(state.sqrtPrice);
      }
    }

    // update to new price
    this.sqrtPrice = state.sqrtPrice;

    // Updating global liquidity
    if (this.liquidity != state.liquidity) this.liquidity = state.liquidity;

    // Update fee growth global
    if (zeroForOne) {
      this.feeGrowthGlobal0 = state.feeGrowthGlobalX;
      if (state.protocolFee.gt(new BigNumber(0)))
        this.protocolFeesToken0 = this.protocolFeesToken0.plus(state.protocolFee);
    } else {
      this.feeGrowthGlobal1 = state.feeGrowthGlobalX;
      if (state.protocolFee.gt(new BigNumber(0)))
        this.protocolFeesToken1 = this.protocolFeesToken1.plus(state.protocolFee);
    }

    const amount0: BigNumber =
      zeroForOne == exactInput
        ? new BigNumber(amountSpecified).minus(state.amountSpecifiedRemaining)
        : state.amountCalculated;
    const amount1: BigNumber =
      zeroForOne == exactInput
        ? new BigNumber(state.amountCalculated)
        : new BigNumber(amountSpecified).minus(state.amountSpecifiedRemaining);

    return [amount0, amount1];
  }

  /**
   * @notice Burn liquidity from the sender and account tokens owed for the liquidity to the position
   * @dev Can be used to trigger a recalculation of fees owed to a position by calling with an amount of 0
   * @dev Fees must be collected separately via a call to #collect
   * @param position The Dex position that is being updated here
   * @param tickLower The lower tick of the position for which to burn liquidity
   * @param tickUpper The upper tick of the position for which to burn liquidity
   * @param amount How much liquidity to burn
   * @return amount0 The amount of token0 sent to the recipient
   * @return amount1 The amount of token1 sent to the recipient
   */
  public burn(position: DexPositionData, tickLower: number, tickUpper: number, amount: BigNumber): BigNumber[] {
    let [amount0, amount1] = this._modifyPosition(position, tickLower, tickUpper, amount.multipliedBy(-1));

    amount0 = amount0.abs();
    amount1 = amount1.abs();

    return [amount0, amount1];
  }

  /**
   * @dev It will estimate the tokens required to add liquidity
   * @param amount Amount for which one wants estimation
   * @param tickLower The lower tick of the position for which to add liquidity
   * @param tickUpper The upper tick of the position for which to add liquidity
   * @param isToken0 Is the amount for token0
   * @return amount0 The amount of token0 are required to add liquidity
   * @return amount1 The amount of token1 are required to add liquidity
   * @return liquidity The amount of liquidity that it consist of
   */
  public getAmountForLiquidity(
    amount: BigNumber,
    tickLower: number,
    tickUpper: number,
    isToken0: boolean
  ): BigNumber[] {
    const sqrtPriceLower = tickToSqrtPrice(tickLower);
    const sqrtPriceUpper = tickToSqrtPrice(tickUpper);
    const tickCurrent = sqrtPriceToTick(this.sqrtPrice);
    let liquidity: BigNumber;
    let res: BigNumber[];
    if (BigNumber(amount).isZero()) throw new ValidationFailedError("You cannot add zero liqudity");
    if (tickCurrent >= tickLower && tickCurrent < tickUpper) {
      liquidity = isToken0
        ? liquidity0(amount, this.sqrtPrice, sqrtPriceUpper)
        : liquidity1(amount, sqrtPriceLower, this.sqrtPrice);
      res = [
        isToken0 ? amount : getAmount0Delta(this.sqrtPrice, sqrtPriceUpper, liquidity),
        isToken0 ? getAmount1Delta(sqrtPriceLower, this.sqrtPrice, liquidity) : amount,
        liquidity
      ];
    } else if (tickCurrent < tickLower) {
      if (!isToken0) {
        throw new ValidationFailedError("Wrong values");
      }
      res = [amount, new BigNumber(0), liquidity0(amount, sqrtPriceLower, sqrtPriceUpper)];
    } else {
      if (isToken0) {
        throw new ValidationFailedError("Wrong values");
      }
      res = [new BigNumber(0), amount, liquidity1(amount, sqrtPriceLower, sqrtPriceUpper)];
    }
    return res;
  }

  /**
   * @dev this will change the Protocol fee of the pool
   * @param protocolFees Percentage of protocol fees that needs to be deducted
   */
  public configureProtocolFee(protocolFees: number) {
    if (this.protocolFees < 0 || this.protocolFees > 1) {
      throw new ValidationFailedError("Protocol Fees out of bounds");
    }
    this.protocolFees = protocolFees;
    return this.protocolFees;
  }

  /**
   * @dev this will bring the state of protocolFeesTokens and reset them to 0
   * @returns [protocolFeeToken0,protocolFeesToken1]
   */
  public collectTradingFees() {
    const protocolFeesToken0 = this.protocolFeesToken0,
      protocolFeesToken1 = this.protocolFeesToken1;
    this.protocolFeesToken0 = new BigNumber(0);
    this.protocolFeesToken1 = new BigNumber(0);
    return [protocolFeesToken0, protocolFeesToken1];
  }
  /**
   *
   * @param position The Dex position that is being updated here
   * @param tickLower The lower tick of the position for which to collect fee accumulated
   * @param tickUpper The upper tick of the position for which to collect fee accumulated
   * @param amount0Requested amount0 The amount of token0 sent to be collected by the recipient
   * @param amount1Requested amount1 The amount of token1 sent to be collected by the recipient
   * @returns
   */
  public collect(
    position: DexPositionData,
    tickLower: number,
    tickUpper: number,
    amount0Requested: BigNumber,
    amount1Requested: BigNumber
  ) {
    if (
      new BigNumber(position.tokensOwed0).lt(amount0Requested) ||
      new BigNumber(position.tokensOwed1).lt(amount1Requested)
    ) {
      const [tokensOwed0, tokensOwed1] = this.getFeeCollectedEstimation(position, tickLower, tickUpper);
      if (tokensOwed0.isGreaterThan(0) || tokensOwed1.isGreaterThan(0)) {
        position.tokensOwed0 = new BigNumber(position.tokensOwed0).plus(tokensOwed0);
        position.tokensOwed1 = new BigNumber(position.tokensOwed1).plus(tokensOwed1);
      }
    }
    if (
      new BigNumber(position.tokensOwed0).lt(amount0Requested) ||
      new BigNumber(position.tokensOwed1).lt(amount1Requested)
    ) {
      throw new ConflictError("Less balance accumulated");
    }
    position.tokensOwed0 = new BigNumber(position.tokensOwed0).minus(amount0Requested);

    position.tokensOwed1 = new BigNumber(position.tokensOwed1).minus(amount1Requested);

    return [amount0Requested, amount1Requested];
  }

  /**
   * @dev it will give Estimation for the tokens collected due swaps
   * @param position The Dex position that is being updated here
   * @param tickLower The lower tick of the position for which to collect fee accumulated
   * @param tickUpper The upper tick of the position for which to collect fee accumulated
   * @returns
   */
  public getFeeCollectedEstimation(position: DexPositionData, tickLower: number, tickUpper: number) {
    // Calculate total fees accumulated in given tick range
    const tickCurrent = sqrtPriceToTick(this.sqrtPrice);
    const [feeGrowthInside0, feeGrowthInside1] = getFeeGrowthInside(
      this.tickData,
      tickLower,
      tickUpper,
      tickCurrent,
      this.feeGrowthGlobal0,
      this.feeGrowthGlobal1
    );

    // Calculate fees accumulated for this position
    const tokensOwed0 = feeGrowthInside0
      .minus(new BigNumber(position.feeGrowthInside0Last))
      .times(new BigNumber(position.liquidity));
    const tokensOwed1 = feeGrowthInside1
      .minus(new BigNumber(position.feeGrowthInside1Last))
      .times(new BigNumber(position.liquidity));

    // Update position to track its last fee collection
    position.feeGrowthInside0Last = feeGrowthInside0;
    position.feeGrowthInside1Last = feeGrowthInside1;

    return [tokensOwed0, tokensOwed1];
  }

  /**
   * @dev returns a hash that is unique to this pool
   * @returns poolHash
   */
  public genPoolHash() {
    const hashingString = [this.token0, this.token1, this.fee].join();
    return keccak256(hashingString);
  }

  /**
   * @dev returns service address which holds the pool's liquidity
   * @returns poolAlias
   */
  public getPoolAlias() {
    return `service|pool_${this.genPoolHash()}`;
  }
}
