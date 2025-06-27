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
  CollectProtocolFeesDto,
  CollectProtocolFeesResDto,
  DexFeeConfig,
  DexFeePercentageTypes,
  Pool,
  TokenBalance,
  TokenClass,
  TokenClassKey,
  TokenInstance
} from "@gala-chain/api";
import {
  currency,
  dex,
  fixture,
  transactionErrorMessageContains,
  transactionSuccess,
  users,
  writesMap
} from "@gala-chain/test";
import BigNumber from "bignumber.js";
import { plainToInstance } from "class-transformer";

import { DexV3Contract } from "../contracts/DexV3Contract";

describe("GetPosition", () => {
  const currencyClass: TokenClass = currency.tokenClass();
  const currencyClassKey: TokenClassKey = currency.tokenClassKey();
  const currencyInstance: TokenInstance = currency.tokenInstance();
  let currBal: TokenBalance;
  let userCurrBal: TokenBalance;

  const dexClass: TokenClass = dex.tokenClass();
  const dexClassKey: TokenClassKey = dex.tokenClassKey();
  const dexInstance: TokenInstance = dex.tokenInstance();
  let dexBal: TokenBalance;
  let userDexBal: TokenBalance;

  let pool: Pool;
  let dexFeeConfig: DexFeeConfig;
  beforeEach(() => {
    // Given
    const token0 = dexClassKey.toStringKey();
    const token1 = currencyClassKey.toStringKey();
    const fee = DexFeePercentageTypes.FEE_1_PERCENT;
    const initialSqrtPrice = new BigNumber("1");

    pool = new Pool(token0, token1, dexClassKey, currencyClassKey, fee, initialSqrtPrice);
    pool.protocolFeesToken0 = new BigNumber(10);
    pool.protocolFeesToken1 = new BigNumber(10);

    currBal = plainToInstance(TokenBalance, {
      ...currency.tokenBalancePlain(),
      owner: pool.getPoolAlias()
    });
    dexBal = plainToInstance(TokenBalance, {
      ...dex.tokenBalancePlain(),
      owner: pool.getPoolAlias()
    });
    userCurrBal = plainToInstance(TokenBalance, {
      ...currency.tokenBalancePlain(),
      owner: users.testUser1Id,
      quantity: new BigNumber(0)
    });
    userDexBal = plainToInstance(TokenBalance, {
      ...dex.tokenBalancePlain(),
      owner: users.testUser1Id,
      quantity: new BigNumber(0)
    });

    const authorities = [users.testUser1Id];
    dexFeeConfig = new DexFeeConfig(authorities, 0.3);
  });

  it("should transfer dex fee", async () => {
    // Given
    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(
        pool,
        dexFeeConfig,
        currencyClass,
        dexClass,
        currencyInstance,
        dexInstance,
        currBal,
        dexBal
      );

    const collectProtocolFeesDto = new CollectProtocolFeesDto(
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_1_PERCENT,
      users.testUser1Id
    );

    pool.protocolFeesToken0 = new BigNumber(0);
    pool.protocolFeesToken1 = new BigNumber(0);
    dexBal.ensureCanSubtractQuantity(new BigNumber(10), ctx.txUnixTime).subtract();
    currBal.ensureCanSubtractQuantity(new BigNumber(10), ctx.txUnixTime).subtract();
    userDexBal.ensureCanAddQuantity(new BigNumber(10)).add();
    userCurrBal.ensureCanAddQuantity(new BigNumber(10)).add();

    // When
    const response = await contract.CollectProtocolFees(ctx, collectProtocolFeesDto);

    // Then
    expect(response).toEqual(
      transactionSuccess(new CollectProtocolFeesResDto(new BigNumber(10), new BigNumber(10)))
    );
    expect(writes).toEqual(writesMap(pool, dexBal, currBal, userCurrBal, userDexBal));
  });

  it("should throw if DexFeeConfig is not defined", async () => {
    // Given
    const { ctx, contract } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(pool, currencyClass, dexClass, currencyInstance, dexInstance, currBal, dexBal); // no fee config

    const dto = new CollectProtocolFeesDto(
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_1_PERCENT,
      users.testUser1Id
    );

    // When
    const res = await contract.CollectProtocolFees(ctx, dto);

    // Then
    expect(res).toEqual(transactionErrorMessageContains("Protocol fee configuration has yet to be defined"));
  });

  it("should throw if calling user is not authorized", async () => {
    // Given
    dexFeeConfig = new DexFeeConfig(["someOtherUser"], 0.3);

    const { ctx, contract } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(
        pool,
        dexFeeConfig,
        currencyClass,
        dexClass,
        currencyInstance,
        dexInstance,
        currBal,
        dexBal
      );

    const dto = new CollectProtocolFeesDto(
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_1_PERCENT,
      users.testUser1Id
    );

    // When
    const res = await contract.CollectProtocolFees(ctx, dto);

    // Then
    expect(res).toEqual(
      transactionErrorMessageContains(`CallingUser ${ctx.callingUser} is not authorized to create or update`)
    );
  });

  it("should not transfer more than pool balance", async () => {
    // Given
    pool.protocolFeesToken0 = new BigNumber(10000);

    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(
        pool,
        dexFeeConfig,
        currencyClass,
        dexClass,
        currencyInstance,
        dexInstance,
        currBal,
        dexBal
      );

    const dto = new CollectProtocolFeesDto(
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_1_PERCENT,
      users.testUser1Id
    );

    pool.protocolFeesToken0 = new BigNumber(9000);
    pool.protocolFeesToken1 = new BigNumber(0);
    dexBal.ensureCanSubtractQuantity(new BigNumber(1000), ctx.txUnixTime).subtract();
    currBal.ensureCanSubtractQuantity(new BigNumber(10), ctx.txUnixTime).subtract();
    userDexBal.ensureCanAddQuantity(new BigNumber(1000)).add();
    userCurrBal.ensureCanAddQuantity(new BigNumber(10)).add();

    // When
    const response = await contract.CollectProtocolFees(ctx, dto);

    // Then
    expect(response).toEqual(
      transactionSuccess(new CollectProtocolFeesResDto(new BigNumber(1000), new BigNumber(10)))
    );
    expect(writes).toEqual(writesMap(pool, dexBal, currBal, userCurrBal, userDexBal));
  });
});
