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
import { BigNumber } from "bignumber.js";
import { plainToInstance } from "class-transformer";

import { ConflictError } from "../utils";
import { DexFeePercentageTypes } from "./DexDtos";
import { DexPositionData } from "./DexPositionData";
import { Pool } from "./DexV3Pool";
import { TickData } from "./TickData";
import { TokenClassKey } from "./TokenClass";

const tokenClass0Properties = {
  collection: "TEST",
  category: "Token",
  type: "Zero",
  additionalKey: "none"
};

const tokenClass1Properties = {
  collection: "TEST",
  category: "Token",
  type: "One",
  additionalKey: "none"
};

describe("DexV3Pool", () => {
  let positionData: DexPositionData;
  let tickLowerData: TickData;
  let tickUpperData: TickData;
  let pool: Pool;
  beforeEach(() => {
    const token0ClassKey = plainToInstance(TokenClassKey, tokenClass0Properties);
    const token1ClassKey = plainToInstance(TokenClassKey, tokenClass1Properties);
    const token0 = token0ClassKey.toStringKey();
    const token1 = token1ClassKey.toStringKey();
    const fee = DexFeePercentageTypes.FEE_1_PERCENT;
    const initialSqrtPrice = new BigNumber("1");

    pool = new Pool(token0, token1, token0ClassKey, token1ClassKey, fee, initialSqrtPrice);

    positionData = new DexPositionData(
      pool.genPoolHash(),
      "test position id",
      100,
      1,
      token0ClassKey,
      token1ClassKey,
      fee
    );

    tickLowerData = plainToInstance(TickData, {
      poolHash: pool.genPoolHash(),
      tick: 1,
      liquidityGross: new BigNumber("100"),
      initialised: true,
      liquidityNet: new BigNumber("100"),
      feeGrowthOutside0: new BigNumber("1"),
      feeGrowthOutside1: new BigNumber("1")
    });

    tickUpperData = plainToInstance(TickData, {
      ...tickLowerData,
      tick: 100
    });
  });

  it("should fail to validate the pool when token class keys are missing proerpties", async () => {
    // Given
    const token0 = "some token key";
    const token1 = "token1 string key";
    const token0ClassKey = new TokenClassKey();
    const token1ClassKey = new TokenClassKey();
    const fee = DexFeePercentageTypes.FEE_1_PERCENT;
    const initialSqrtPrice = new BigNumber("1");

    // When
    const pool = new Pool(token0, token1, token0ClassKey, token1ClassKey, fee, initialSqrtPrice);
    const validationResult = await pool.validate();
    // Then
    expect(validationResult.length).toBeGreaterThan(0);
  });

  test("should validate the pool when token class keys contain all properties", async () => {
    // Given
    const token0 = "some token key";
    const token1 = "token1 string key";
    const token0ClassKey = plainToInstance(TokenClassKey, tokenClass0Properties);
    const token1ClassKey = plainToInstance(TokenClassKey, tokenClass1Properties);
    const fee = DexFeePercentageTypes.FEE_1_PERCENT;
    const initialSqrtPrice = new BigNumber("1");

    // When
    const pool = new Pool(token0, token1, token0ClassKey, token1ClassKey, fee, initialSqrtPrice);
    const validationResult = await pool.validate();
    // Then
    expect(validationResult).toEqual([]);
  });

  test("should validate the pool with more complex properties", async () => {
    // Given
    const token0 = "some token key";
    const token1 = "token1 string key";
    const token0ClassKey = plainToInstance(TokenClassKey, tokenClass0Properties);
    const token1ClassKey = plainToInstance(TokenClassKey, tokenClass1Properties);
    const fee = DexFeePercentageTypes.FEE_1_PERCENT;
    const initialSqrtPrice = new BigNumber("1");

    const bitmap: Record<string, string> = { 1: "test 1", test: "test 2" };

    const pool = new Pool(token0, token1, token0ClassKey, token1ClassKey, fee, initialSqrtPrice);

    pool.bitmap = bitmap;
    pool.liquidity = new BigNumber("1");
    pool.feeGrowthGlobal0 = new BigNumber("1");
    pool.feeGrowthGlobal1 = new BigNumber("1");
    pool.maxLiquidityPerTick = new BigNumber("1");
    pool.tickSpacing = 1;
    pool.protocolFees = 1;
    pool.protocolFeesToken0 = new BigNumber("1");
    pool.protocolFeesToken1 = new BigNumber("1");

    // When
    const validationResult = await pool.validate();
    // Then
    expect(validationResult).toEqual([]);
  });

  test("should fail validation if fee is invalid", async () => {
    // Given
    const token0 = "some token key";
    const token1 = "token1 string key";
    const token0ClassKey = plainToInstance(TokenClassKey, tokenClass0Properties);
    const token1ClassKey = plainToInstance(TokenClassKey, tokenClass1Properties);

    const invalidFee = 999 as DexFeePercentageTypes;

    const initialSqrtPrice = new BigNumber("1");

    const pool = new Pool(token0, token1, token0ClassKey, token1ClassKey, invalidFee, initialSqrtPrice);

    // When
    const validationResult = await pool.validate();
    // Then
    expect(validationResult.length).toBeGreaterThan(0);
  });

  test("pool.mint", async () => {
    // When
    const [amount0, amount1] = pool.mint(positionData, tickLowerData, tickUpperData, new BigNumber(1));

    const validationResult = await pool.validate();

    // Then
    expect(validationResult).toEqual([]);
    expect(amount0).toEqual(new BigNumber("0.00493727582043612206"));
    expect(amount1).toEqual(new BigNumber("0"));
  });

  test("pool mint requires both tokens when position is in range", async () => {
    // Given
    const updatedTickLowerData = plainToInstance(TickData, {
      ...tickLowerData,
      tick: -100
    });

    // When
    const [amount0, amount1] = pool.mint(positionData, updatedTickLowerData, tickUpperData, new BigNumber(1));

    const validationResult = await pool.validate();

    // Then
    expect(validationResult).toEqual([]);
    expect(amount0).toEqual(new BigNumber("0.00498727207074849864"));
    expect(amount1).toEqual(new BigNumber("0.0049872720707486"));
  });

  test("mint throws error when liquidity is zero", () => {
    expect(() => {
      // When
      pool.mint(positionData, tickLowerData, tickUpperData, new BigNumber("0"));
      // Then
    }).toThrow("Invalid Liquidity");
  });

  test("should throw error for invalid tick range", () => {
    // Given
    const tickLower = 100;
    const tickUpper = 60; // lower > upper = invalid

    const liquidity = new BigNumber(1000);
    const invalidPositionData = plainToInstance(DexPositionData, { ...positionData, tickLower, tickUpper });
    const invalidTickUpperData = plainToInstance(TickData, {
      ...tickUpperData,
      tick: 60
    });
    const invalidTickLowerData = plainToInstance(TickData, {
      ...tickLowerData,
      tick: 100
    });

    // When & Then
    expect(() => {
      pool.mint(invalidPositionData, invalidTickLowerData, invalidTickUpperData, liquidity);
    }).toThrow();
  });

  test("burn: should return positive token amounts after liquidity removal", () => {
    // Given
    pool.mint(positionData, tickLowerData, tickUpperData, new BigNumber(1));

    // When
    const [amount0, amount1] = pool.burn(positionData, tickLowerData, tickUpperData, new BigNumber(1));

    // Then
    expect(amount0).toEqual(new BigNumber("0.00493727582043612206"));
    expect(amount1).toEqual(new BigNumber("0"));
  });

  test("burn: should not allow burning more than existing liquidity", () => {
    // Given
    pool.mint(positionData, tickLowerData, tickUpperData, new BigNumber(1));

    // When
    expect(() => {
      pool.burn(positionData, tickLowerData, tickUpperData, new BigNumber(10));
      // Then
    }).toThrow(new ConflictError("Uint Out of Bounds error :Uint"));
  });

  test("should return correct amounts and liquidity when current tick is in range and token0 is provided", () => {
    // Given
    const amount = new BigNumber(1000);
    const tickLower = -60;
    const tickUpper = 60;

    // When
    const [amount0, amount1, liquidity] = pool.getAmountForLiquidity(amount, tickLower, tickUpper, true);

    // Then
    expect(amount0.isEqualTo(amount)).toBe(true);
    expect(amount1.isEqualTo(new BigNumber("999.999999999980893191863136695785480256")));
    expect(liquidity.isEqualTo(new BigNumber("333850.24970973552810742589")));
  });

  it("should return only token1 and liquidity when current tick is above range", () => {
    // Given
    const amount = new BigNumber(10);
    const tickLower = -60;
    const tickUpper = -20;

    // When
    const [amount0, amount1, liquidity] = pool.getAmountForLiquidity(amount, tickLower, tickUpper, false);

    // Then
    expect(amount0.isEqualTo(new BigNumber("0")));
    expect(amount1.isEqualTo(amount)).toBe(true);
    expect(liquidity.isEqualTo(new BigNumber("5010.25916704397590249112")));
  });

  it("should throw error when token0 is provided but current tick is above range", () => {
    // Given
    const amount = new BigNumber(10);
    const tickLower = -60;
    const tickUpper = -20;

    // When
    expect(() => {
      pool.getAmountForLiquidity(amount, tickLower, tickUpper, true);
      // Then
    }).toThrow(new ConflictError("Wrong values"));
  });

  it("should throw error when amount is zero", () => {
    // Given
    const amount = new BigNumber(0);
    const tickLower = -60;
    const tickUpper = -20;

    // When
    expect(() => {
      pool.getAmountForLiquidity(amount, tickLower, tickUpper, true);
      // Then
    }).toThrow(new ConflictError("You cannot add zero liqudity"));
  });

  it("should set protocol fee when given a valid value", () => {
    // When
    const result = pool.configureProtocolFee(0.1);

    // Then
    expect(result).toBe(0.1);
    expect(pool.protocolFees).toBe(0.1);
  });

  it("should throw an error when setting protocol fee to a negative value", () => {
    // When
    expect(() => {
      pool.configureProtocolFee(-0.1);
      // Then
    }).toThrow("Protocol Fees out of bounds");
  });

  it("should return and reset protocol fees when collectProtocolFees is called", () => {
    // Given
    pool.protocolFeesToken0 = new BigNumber(100);
    pool.protocolFeesToken1 = new BigNumber(200);

    // When
    const [fee0, fee1] = pool.collectProtocolFees();

    // Then
    expect(fee0.isEqualTo(100)).toBe(true);
    expect(fee1.isEqualTo(200)).toBe(true);
    expect(pool.protocolFeesToken0.isZero()).toBe(true);
    expect(pool.protocolFeesToken1.isZero()).toBe(true);
  });

  it("should deduct requested amounts from tokensOwed if sufficient balance", () => {
    // Given
    positionData.tokensOwed0 = new BigNumber(100);
    positionData.tokensOwed1 = new BigNumber(200);

    // When
    const [amount0, amount1] = pool.collect(
      positionData,
      tickLowerData,
      tickUpperData,
      new BigNumber(50),
      new BigNumber(100)
    );

    // Then
    expect(amount0.isEqualTo(50)).toBe(true);
    expect(amount1.isEqualTo(100)).toBe(true);
    expect(positionData.tokensOwed0.isEqualTo(50)).toBe(true);
    expect(positionData.tokensOwed1.isEqualTo(100)).toBe(true);
  });

  it("should update position tokens owed from fee estimation if more fees have accumulated", () => {
    // Given
    positionData.tokensOwed0 = new BigNumber(10);
    positionData.tokensOwed1 = new BigNumber(10);

    jest.spyOn(pool, "getFeeCollectedEstimation").mockReturnValue([new BigNumber(100), new BigNumber(100)]);

    // When
    const [amount0, amount1] = pool.collect(
      positionData,
      tickLowerData,
      tickUpperData,
      new BigNumber(50),
      new BigNumber(50)
    );

    // Then
    expect(amount0.isEqualTo(50)).toBe(true);
    expect(amount1.isEqualTo(50)).toBe(true);
    expect(positionData.tokensOwed0.isEqualTo(60)).toBe(true); // 10 + 100 - 50
    expect(positionData.tokensOwed1.isEqualTo(60)).toBe(true); // 10 + 100 - 50
  });

  it("should throw ConflictError if after estimation tokens owed are still insufficient", () => {
    // Given
    positionData.tokensOwed0 = new BigNumber(10);
    positionData.tokensOwed1 = new BigNumber(10);

    jest.spyOn(pool, "getFeeCollectedEstimation").mockReturnValue([new BigNumber(0), new BigNumber(0)]);

    // When
    expect(
      () => pool.collect(positionData, tickLowerData, tickUpperData, new BigNumber(50), new BigNumber(50))
      // Then
    ).toThrow(new ConflictError("Less balance accumulated"));
  });
});
