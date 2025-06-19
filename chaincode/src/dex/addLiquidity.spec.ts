import {
  AddLiquidityDTO,
  ConflictError,
  DexFeePercentageTypes,
  DexOperationResDto,
  GalaChainResponse,
  GalaChainResponseType,
  GetAddLiquidityEstimationDto,
  Pool,
  TokenBalance,
  TokenClass,
  TokenClassKey,
  TokenInstance,
  ValidationFailedError,
  feeAmountTickSpacing,
  sqrtPriceToTick
} from "@gala-chain/api";
import { currency, dex, fixture, poolTest, users } from "@gala-chain/test";
import BigNumber from "bignumber.js";
import { plainToInstance } from "class-transformer";
import { randomUUID } from "crypto";

import { DexV3Contract } from "../__test__/TestDexV3Contract";

describe("Add Liquidity", () => {
  const currencyInstance: TokenInstance = currency.tokenInstance();
  const currencyClass: TokenClass = currency.tokenClass();
  const currencyClassKey: TokenClassKey = currency.tokenClassKey();

  const dexInstance: TokenInstance = dex.tokenInstance();
  const dexClass: TokenClass = dex.tokenClass();
  const dexClassKey: TokenClassKey = dex.tokenClassKey();

  const fee = DexFeePercentageTypes.FEE_0_05_PERCENT;

  const pool = new Pool(
    dexClassKey.toString(),
    currencyClassKey.toString(),
    dexClassKey,
    currencyClassKey,
    fee,
    new BigNumber("44.71236")
  );

  it("Should throw error while adding liquidity below minimum tick", async () => {
    //Given
    const tickLower = -887280,
      tickUpper = -324340;

    const dto = new AddLiquidityDTO(
      dexClassKey,
      currencyClassKey,
      fee,
      tickLower,
      tickUpper,
      new BigNumber(1),
      new BigNumber(1),
      new BigNumber(1),
      new BigNumber(1),
      undefined
    );
    dto.uniqueKey = randomUUID();

    const { ctx, contract } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(dexClass, currencyClass, dexInstance, currencyInstance, pool);

    //When
    const addLiquidityRes = await contract.AddLiquidity(ctx, dto);

    //Then
    expect(addLiquidityRes).toEqual({
      Status: GalaChainResponseType.Error,
      ErrorCode: 400,
      ErrorKey: "DTO_VALIDATION_FAILED",
      ErrorPayload: ["min: tickLower must not be less than -887272"],
      Message: "DTO validation failed: (1) min: tickLower must not be less than -887272"
    });

    console.log("This add liq is passed 1");
  });

  it("Should throw error while adding liquidity above maximum tick", async () => {
    //Given

    const tickLower = 76110;
    const tickUpper = 887350;

    const dto = new AddLiquidityDTO(
      dexClassKey,
      currencyClassKey,
      fee,
      tickLower,
      tickUpper,
      new BigNumber(1),
      new BigNumber(1),
      new BigNumber(1),
      new BigNumber(1),
      undefined
    );
    dto.uniqueKey = randomUUID();

    const currencyUserBalance: TokenBalance = plainToInstance(TokenBalance, {
      ...currency.tokenBalancePlain(),
      owner: users.testUser1Id
    });

    const dexUserBalance: TokenBalance = plainToInstance(TokenBalance, {
      ...dex.tokenBalancePlain(),
      owner: users.testUser1Id
    });

    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(
        dexClass,
        currencyClass,
        dexInstance,
        currencyInstance,
        pool,
        dexUserBalance,
        currencyUserBalance
      );

    const addLiquidityRes = await contract.AddLiquidity(ctx, dto);

    expect(addLiquidityRes).toEqual({
      Status: GalaChainResponseType.Error,
      ErrorCode: 400,
      ErrorKey: "DTO_VALIDATION_FAILED",
      ErrorPayload: ["max: tickUpper must not be greater than 887272"],
      Message: "DTO validation failed: (1) max: tickUpper must not be greater than 887272"
    });

    console.log("This add liq is passed 2");
  });

  it("It should throw error  when tick lower is greater than upper tick", async () => {
    //Given
    const tickLower = 887280;
    const tickUpper = -324340;

    const dto = new AddLiquidityDTO(
      dexClassKey,
      currencyClassKey,
      fee,
      tickLower,
      tickUpper,
      new BigNumber(1),
      new BigNumber(1),
      new BigNumber(1),
      new BigNumber(1),
      undefined
    );
    dto.uniqueKey = randomUUID();

    const currencyUserBalance: TokenBalance = plainToInstance(TokenBalance, {
      ...currency.tokenBalancePlain(),
      owner: users.testUser1Id
    });

    const dexUserBalance: TokenBalance = plainToInstance(TokenBalance, {
      ...dex.tokenBalancePlain(),
      owner: users.testUser1Id
    });

    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(
        dexClass,
        currencyClass,
        dexInstance,
        currencyInstance,
        pool,
        dexUserBalance,
        currencyUserBalance
      );

    //When
    const addLiquidityRes = await contract.AddLiquidity(ctx, dto);

    //Then
    expect(addLiquidityRes).toEqual({
      Status: GalaChainResponseType.Error,
      ErrorCode: 400,
      ErrorKey: "DTO_VALIDATION_FAILED",
      ErrorPayload: ["isLessThan: tickLower must be less than tickUpper"],
      Message: "DTO validation failed: (1) isLessThan: tickLower must be less than tickUpper"
    });
    console.log("This add liq is passed 3");
  });

  it("Should throw error when ticks are not spaced", async () => {
   //Given
    const tickLower = 887;
    const tickUpper = 32434;

    const dto = new AddLiquidityDTO(
      dexClassKey,
      currencyClassKey,
      fee,
      tickLower,
      tickUpper,
      new BigNumber(1),
      new BigNumber(1),
      new BigNumber(1),
      new BigNumber(1),
      undefined
    );
    dto.uniqueKey = randomUUID();

    pool.maxLiquidityPerTick = new BigNumber("19200");

    const currencyUserBalance: TokenBalance = plainToInstance(TokenBalance, {
      ...currency.tokenBalancePlain(),
      owner: users.testUser1Id
    });

    const dexUserBalance: TokenBalance = plainToInstance(TokenBalance, {
      ...dex.tokenBalancePlain(),
      owner: users.testUser1Id
    });

    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(
        dexClass,
        currencyClass,
        dexInstance,
        currencyInstance,
        pool,
        dexUserBalance,
        currencyUserBalance
      );

    //When
    const addLiquidityRes = await contract.AddLiquidity(ctx, dto);

   //Then
    expect(addLiquidityRes).toEqual(
      GalaChainResponse.Error(new ValidationFailedError("Tick is not spaced 887 10"))
    );

    expect(writes).toEqual({});
    console.log("This add liq is passed 4");
  });

  test("Adding liquidity more than max liquidity will throw error", async () => {
    
    //Given
    const pa = 1700,
      pb = 1900;
    const fee = 500;
    const tickSpacing = feeAmountTickSpacing[fee];
    const [ta, tb] = spacedTicksFromPrice(pa, pb, tickSpacing);
    const slippage = 0.5;
    const token0 = new BigNumber("10"),
      token1 = new BigNumber("10000000000000000000000000000000000000000000");
    const [token0Slipped, token1Slipped] = slippedValue([token0, token1], slippage);

    const currencyUserBalance: TokenBalance = plainToInstance(TokenBalance, {
      ...currency.tokenBalancePlain(),
      owner: users.testUser1Id
    });

    const dexUserBalance: TokenBalance = plainToInstance(TokenBalance, {
      ...dex.tokenBalancePlain(),
      owner: users.testUser1Id
    });

    const dto = new AddLiquidityDTO(
      dexClassKey,
      currencyClassKey,
      fee,
      ta,
      tb,
      token0,
      token1,
      token0Slipped,
      token1Slipped,
      undefined
    );
    dto.uniqueKey = randomUUID();

    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(
        dexClass,
        currencyClass,
        dexInstance,
        currencyInstance,
        pool,
        dexUserBalance,
        currencyUserBalance
      );

    //When
    const addLiquidityRes = await contract.AddLiquidity(ctx, dto);
    
    //Then
    expect(addLiquidityRes).toEqual(
      GalaChainResponse.Error(new ValidationFailedError("liquidity crossed max liquidity"))
    );
    console.log("This add liq is passed 5");
  });

  test("Adding liquidity equal to zero will throw an error", async () => {
    
    //Given
    const pa = 1700,
      pb = 1900;
    const fee = 500;
    const tickSpacing = feeAmountTickSpacing[fee];

    const [ta, tb] = spacedTicksFromPrice(pa, pb, tickSpacing);
    const slippage = 0.5;
    const token0 = new BigNumber("0"),
      token1 = new BigNumber("0");
    const [token0Slipped, token1Slipped] = slippedValue([token0, token1], slippage);

    const currencyUserBalance: TokenBalance = plainToInstance(TokenBalance, {
      ...currency.tokenBalancePlain(),
      owner: users.testUser1Id
    });

    const dexUserBalance: TokenBalance = plainToInstance(TokenBalance, {
      ...dex.tokenBalancePlain(),
      owner: users.testUser1Id
    });

    const dto = new AddLiquidityDTO(
      dexClassKey,
      currencyClassKey,
      fee,
      ta,
      tb,
      token0,
      token1,
      token0Slipped,
      token1Slipped,
      undefined
    );
    dto.uniqueKey = randomUUID();

    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(
        dexClass,
        currencyClass,
        dexInstance,
        currencyInstance,
        pool,
        dexUserBalance,
        currencyUserBalance
      );

    //When
    const addLiquidityRes = await contract.AddLiquidity(ctx, dto);
   
    //Then
    expect(addLiquidityRes).toEqual(GalaChainResponse.Error(new ValidationFailedError("Invalid Liquidity")));

    console.log("This add liq is passed 6");
  });


  

  test("Add liquidity in range 1700 - 1900", async () => {
    console.log("1..1");
    const tickSpacing = feeAmountTickSpacing[fee];

    const pa = 1700,
      pb = 1900;

    pool.maxLiquidityPerTick = new BigNumber("1917565579412846627735051215301243.08110657663841167978");

    const [ta, tb] = spacedTicksFromPrice(pa, pb, tickSpacing);

    const slippage = 0.5;

    const currencyUserBalance: TokenBalance = plainToInstance(TokenBalance, {
      ...currency.tokenBalancePlain(),
      owner: users.testUser1Id
    });

    const dexUserBalance: TokenBalance = plainToInstance(TokenBalance, {
      ...dex.tokenBalancePlain(),
      owner: users.testUser1Id
    });

    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(
        dexClass,
        currencyClass,
        dexInstance,
        currencyInstance,
        pool,
        dexUserBalance,
        currencyUserBalance
      );

    const AmountForLiquidity = pool.getAmountForLiquidity(new BigNumber("1"), ta, tb, false);

    const token0 = new BigNumber(AmountForLiquidity[0]);
    const token1 = new BigNumber(AmountForLiquidity[1]);

    const [token0Slipped, token1Slipped] = slippedValue([token0, token1], slippage);

    const dto = new AddLiquidityDTO(
      dexClassKey,
      currencyClassKey,
      fee,
      ta,
      tb,
      token0,
      token1,
      token0Slipped,
      token1Slipped,
      undefined
    );
    dto.uniqueKey = randomUUID();
    console.log("1..3");
    const addLiquidityRes = await contract.AddLiquidity(ctx, dto);
    console.log("add liquidity response output", JSON.stringify(addLiquidityRes));

    // const createPoolResDTO = plainToInstance(CreatePoolResDto, {
    //   token0: ETHClassKey,
    //   token1: USDTClassKey,
    //   poolFee: fee,
    //   poolHash: poolObj.genPoolHash(),
    //   poolAlias: poolObj.getPoolAlias()
    // });

    // const expectedRes =  plainToInstance(DexOperationResDto,

    //   )

    //console.log("ADD LIQUIDITY RES", addLiquidityRes);
  });

  // test("Add liquidity in range 1980 - 2020", async () => {
  //   const pa = 1980,
  //     pb = 2020;
  //   const fee = 500;
  //   const tickSpacing = feeAmountTickSpacing[fee];
  //   const [ta, tb] = spacedTicksFromPrice(pa, pb, tickSpacing);
  //   const slippage = 0.5;

  //   const poolObj = poolTest.poolPlain((plain) => ({
  //     ...plain,
  //     token0: ETHClassKey.toString(),
  //     token1: USDTClassKey.toString(),
  //     fee: fee,

  //     maxLiquidityPerTick: new BigNumber("1917565579412846627735051215301243.08110657663841167978")
  //   }));

  //   const AmountForLiquidity = poolObj.getAmountForLiquidity(new BigNumber("10"), ta, tb, false);

  //   const token0 = new BigNumber(AmountForLiquidity[0]);
  //   const token1 = new BigNumber(AmountForLiquidity[1]);

  //   console.log("TOKEN0", token0);
  //   console.log("Token1", token1);

  //   const [token0Slipped, token1Slipped] = slippedValue([token0, token1], slippage);

  //   console.log("TA", ta);
  //   console.log("TB", tb);

  //   const dto = new AddLiquidityDTO(
  //     ETHClassKey,
  //     USDTClassKey,
  //     fee,
  //     ta,
  //     tb,
  //     token0,
  //     token1,
  //     token0Slipped,
  //     token1Slipped,
  //     undefined
  //   );
  //   dto.uniqueKey = randomUUID();

  //   const USDTBalance = currency.tokenBalance((b) => ({
  //     ...b,
  //     owner: users.testUser1Id,
  //     collection: "USDT",
  //     category: "Unit",
  //     type: "none",
  //     quantity: new BigNumber("10000000")
  //   }));

  //   const ETHbalance = currency.tokenBalance((b) => ({
  //     ...b,
  //     owner: users.testUser1Id,
  //     collection: "ETH",
  //     category: "Unit",
  //     type: "none",
  //     additionalKey: "none",
  //     quantity: new BigNumber("10000000")
  //   }));

  //   const { ctx, contract, writes } = fixture(DexV3Contract)
  //     .callingUser(users.testUser1Id)
  //     .savedState(
  //       ETHtokenClass,
  //       USDTtokenClass,
  //       USDTInstance,
  //       ETHInstance,
  //       poolObj,
  //       USDTBalance,
  //       ETHbalance,
  //       USDTInstance,
  //       ETHInstance
  //     );

  //   const addLiquidityRes = await contract.AddLiquidity(ctx, dto);
  //   console.log("Addd liqudity respomse", addLiquidityRes);
  // });
});

const spacedTicksFromPrice = (pa: number, pb: number, tickSpacing: number) => {
  return [
    Math.ceil(sqrtPriceToTick(new BigNumber(Math.sqrt(pa))) / tickSpacing) * tickSpacing,
    Math.floor(sqrtPriceToTick(new BigNumber(Math.sqrt(pb))) / tickSpacing) * tickSpacing
  ];
};

function slippedValue(val: BigNumber[], slippage: BigNumber | number) {
  if (typeof slippage === "number" || typeof slippage === "string") {
    slippage = new BigNumber(slippage);
  }
  const hundred = new BigNumber(100);
  return val.map((e) => e.multipliedBy(hundred.minus(slippage)).dividedBy(hundred));
}
