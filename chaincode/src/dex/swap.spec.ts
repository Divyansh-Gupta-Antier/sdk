import { SlippageToleranceExceededError } from './../../../chain-api/src/utils/error';
import {
  ConflictError,
  DexFeePercentageTypes,
  DexPositionData,
  GalaChainResponse,
  Pool,
  SwapDto,
  SwapResDto,
  TickData,
  TokenBalance,
  TokenClass,
  TokenClassKey,
  TokenInstance,
  ValidationFailedError
} from "@gala-chain/api";
import { currency, dex, fixture, users } from "@gala-chain/test";
import BigNumber from "bignumber.js";
import { plainToInstance } from "class-transformer";

import { DexV3Contract } from "../contracts";

describe("Swap Test", () => {
  
  test("User Should be able to swap tokens || zeroForOne = True", async () => {
    const fee = 500;

    const currencyInstance: TokenInstance = currency.tokenInstance();
    const currencyClassKey: TokenClassKey = currency.tokenClassKey();
    const currencyClass: TokenClass = currency.tokenClass();

    const dexInstance: TokenInstance = dex.tokenInstance();
    const dexClassKey: TokenClassKey = dex.tokenClassKey();
    const dexClass: TokenClass = dex.tokenClass();

    const poolObj = new Pool(
      dexClassKey.toString(),
      currencyClassKey.toString(),
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_0_05_PERCENT,
      new BigNumber("44.71236")
    );

    const currencyPoolBal: TokenBalance = plainToInstance(TokenBalance, {
      ...currency.tokenBalancePlain(),
      owner: poolObj.getPoolAlias()
    });
    currencyPoolBal.ensureCanAddQuantity(new BigNumber("5000")).add();

    const dexPoolBal: TokenBalance = plainToInstance(TokenBalance, {
      ...dex.tokenBalancePlain(),
      owner: poolObj.getPoolAlias()
    });

    const dexUserBal: TokenBalance = plainToInstance(TokenBalance, {
      ...dex.tokenBalancePlain(),
      owner: users.testUser1Id
    });

    const currencyUserBal: TokenBalance = plainToInstance(TokenBalance, {
      ...currency.tokenBalancePlain(),
      owner: users.testUser1Id
    });

    const currentSqrtPrice = new BigNumber("44.71236");
    const sqrtPriceLimit = currentSqrtPrice.multipliedBy(0.85);

    //Adding liquiidty the pool
    const positionData = new DexPositionData(
      poolObj.genPoolHash(),
      "POSITION-ID",
      887270,
      -887270,
      dexClassKey,
      currencyClassKey,
      fee
    );

    const tickLowerData = new TickData(poolObj.genPoolHash(), -887270);

    const tickUpperData = new TickData(poolObj.genPoolHash(), 887270);

    poolObj.mint(positionData, tickLowerData, tickUpperData, new BigNumber("80000"));

    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(
        currencyClass,
        currencyInstance,
        dexInstance,
        dexClass,
        poolObj,
        currencyPoolBal,
        dexPoolBal,
        dexUserBal,
        currencyUserBal
      );

    const dto = new SwapDto(dexClassKey, currencyClassKey, fee, new BigNumber("1.5"), true, sqrtPriceLimit);

    const swapRes = await contract.Swap(ctx, dto);


    expect(swapRes.Data).toMatchObject({
      token0: "AUTC",
      token0ImageUrl: "https://app.gala.games/test-image-placeholder-url.png",
      token1: "AUTC",
      token1ImageUrl: "https://app.gala.games/test-image-placeholder-url.png",
      amount0: "1.5000000000",
      amount1: "-2994.7838668809",
      userAddress: "client|testUser1",
      poolHash: "adab0db73917131fcd7fafc805b6092fe65c1bdf923ecbe7c5ea640b68f5f523",
      poolAlias: "service|pool_adab0db73917131fcd7fafc805b6092fe65c1bdf923ecbe7c5ea640b68f5f523",
      poolFee: 500
    });
  });


  test("User Should be able to swap tokens || zeroForOne = False", async () => {
    const fee = 500;

    const currencyInstance: TokenInstance = currency.tokenInstance();
    const currencyClassKey: TokenClassKey = currency.tokenClassKey();
    const currencyClass: TokenClass = currency.tokenClass();

    const dexInstance: TokenInstance = dex.tokenInstance();
    const dexClassKey: TokenClassKey = dex.tokenClassKey();
    const dexClass: TokenClass = dex.tokenClass();

    const poolObj = new Pool(
      dexClassKey.toString(),
      currencyClassKey.toString(),
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_0_05_PERCENT,
      new BigNumber("44.71236")
    );

    const currencyPoolBal: TokenBalance = plainToInstance(TokenBalance, {
      ...currency.tokenBalancePlain(),
      owner: poolObj.getPoolAlias()
    });
    currencyPoolBal.ensureCanAddQuantity(new BigNumber("5000")).add();

    const dexPoolBal: TokenBalance = plainToInstance(TokenBalance, {
      ...dex.tokenBalancePlain(),
      owner: poolObj.getPoolAlias()
    });

    const dexUserBal: TokenBalance = plainToInstance(TokenBalance, {
      ...dex.tokenBalancePlain(),
      owner: users.testUser1Id
    });

    const currencyUserBal: TokenBalance = plainToInstance(TokenBalance, {
      ...currency.tokenBalancePlain(),
      owner: users.testUser1Id
    });

    const currentSqrtPrice = new BigNumber("44.71236");
    const sqrtPriceLimit = currentSqrtPrice.multipliedBy(1.2);

    //Adding liquiidty the pool
    const positionData = new DexPositionData(
      poolObj.genPoolHash(),
      "POSITION-ID",
      887270,
      -887270,
      dexClassKey,
      currencyClassKey,
      fee
    );

    const tickLowerData = new TickData(poolObj.genPoolHash(), -887270);

    const tickUpperData = new TickData(poolObj.genPoolHash(), 887270);

    poolObj.mint(positionData, tickLowerData, tickUpperData, new BigNumber("80000"));

    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(
        currencyClass,
        currencyInstance,
        dexInstance,
        dexClass,
        poolObj,
        currencyPoolBal,
        dexPoolBal,
        dexUserBal,
        currencyUserBal
      );

    const dto = new SwapDto(dexClassKey, currencyClassKey, fee, new BigNumber("1.5"), false, sqrtPriceLimit);

    const swapRes = await contract.Swap(ctx, dto);
  
    expect(swapRes.Data).toMatchObject({
      token0: "AUTC",
      token0ImageUrl: "https://app.gala.games/test-image-placeholder-url.png",
      token1: "AUTC",
      token1ImageUrl: "https://app.gala.games/test-image-placeholder-url.png",
      amount0: "-0.0007499265",
      amount1: "1.5000000000",
      userAddress: "client|testUser1",
      poolHash: "adab0db73917131fcd7fafc805b6092fe65c1bdf923ecbe7c5ea640b68f5f523",
      poolAlias: "service|pool_adab0db73917131fcd7fafc805b6092fe65c1bdf923ecbe7c5ea640b68f5f523",
      poolFee: 500
    });
  });

  test("It will revert if square root price limit exceeds pool's squareroot price limit", async () => {
    const fee = 500;

    const currencyInstance: TokenInstance = currency.tokenInstance();
    const currencyClassKey: TokenClassKey = currency.tokenClassKey();
    const currencyClass: TokenClass = currency.tokenClass();

    const dexInstance: TokenInstance = dex.tokenInstance();
    const dexClassKey: TokenClassKey = dex.tokenClassKey();
    const dexClass: TokenClass = dex.tokenClass();

    const poolObj = new Pool(
      dexClassKey.toString(),
      currencyClassKey.toString(),
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_0_05_PERCENT,
      new BigNumber("44.71236")
    );

    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(currencyClass, currencyInstance, dexInstance, dexClass, poolObj);

    const currentSqrtPrice = new BigNumber("40.71236");
    const sqrtPriceLimit = currentSqrtPrice.multipliedBy(1.5);

    const dto = new SwapDto(dexClassKey, currencyClassKey, fee, new BigNumber("1.5"), true, sqrtPriceLimit);

    const swapRes = await contract.Swap(ctx, dto);

    expect(swapRes).toEqual(GalaChainResponse.Error(
      new SlippageToleranceExceededError('SquareRootPrice Limit Exceeds')
    ))
   
  });

  test("It will revert if sqrt price is below the base sqrt price limit (0.000000000000000000054212146)", async()=>{

    const fee = 500;

    const currencyInstance: TokenInstance = currency.tokenInstance();
    const currencyClassKey: TokenClassKey = currency.tokenClassKey();
    const currencyClass: TokenClass = currency.tokenClass();

    const dexInstance: TokenInstance = dex.tokenInstance();
    const dexClassKey: TokenClassKey = dex.tokenClassKey();
    const dexClass: TokenClass = dex.tokenClass();

    const poolObj = new Pool(
      dexClassKey.toString(),
      currencyClassKey.toString(),
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_0_05_PERCENT,
      new BigNumber("44.71236")
    );

    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(currencyClass, currencyInstance, dexInstance, dexClass, poolObj);

    const dto = new SwapDto(dexClassKey, currencyClassKey, fee, new BigNumber("1.5"), true, new BigNumber("0.000000000000000000054212146"));
    const swapRes = await contract.Swap(ctx, dto);

    expect(swapRes).toEqual(GalaChainResponse.Error(
      new SlippageToleranceExceededError('SquareRootPrice Limit Exceeds')
    ));

  });

  test("It will revert if sqrt price is below the base sqrt price limit (18446051000000000000)", async()=>{

      const fee = 500;

      const currencyInstance: TokenInstance = currency.tokenInstance();
      const currencyClassKey: TokenClassKey = currency.tokenClassKey();
      const currencyClass: TokenClass = currency.tokenClass();
  
      const dexInstance: TokenInstance = dex.tokenInstance();
      const dexClassKey: TokenClassKey = dex.tokenClassKey();
      const dexClass: TokenClass = dex.tokenClass();
  
      const poolObj = new Pool(
        dexClassKey.toString(),
        currencyClassKey.toString(),
        dexClassKey,
        currencyClassKey,
        DexFeePercentageTypes.FEE_0_05_PERCENT,
        new BigNumber("44.71236")
      );
  
      const { ctx, contract, writes } = fixture(DexV3Contract)
        .callingUser(users.testUser1Id)
        .savedState(currencyClass, currencyInstance, dexInstance, dexClass, poolObj);
  
      const dto = new SwapDto(dexClassKey, currencyClassKey, fee, new BigNumber("1.5"), true, new BigNumber("18446051000000000000"));
      const swapRes = await contract.Swap(ctx, dto);
  
      expect(swapRes).toEqual(GalaChainResponse.Error(
        new SlippageToleranceExceededError('SquareRootPrice Limit Exceeds')
      ));

   
      

  });

  test("It will revert if specified amount is O", async()=>{

    const fee = 500;

    const currencyInstance: TokenInstance = currency.tokenInstance();
    const currencyClassKey: TokenClassKey = currency.tokenClassKey();
    const currencyClass: TokenClass = currency.tokenClass();

    const dexInstance: TokenInstance = dex.tokenInstance();
    const dexClassKey: TokenClassKey = dex.tokenClassKey();
    const dexClass: TokenClass = dex.tokenClass();

    const poolObj = new Pool(
      dexClassKey.toString(),
      currencyClassKey.toString(),
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_0_05_PERCENT,
      new BigNumber("44.71236")
    );

    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(currencyClass, currencyInstance, dexInstance, dexClass, poolObj);

    const dto = new SwapDto(dexClassKey, currencyClassKey, fee, new BigNumber("0"), true, new BigNumber("42.71236"));

    const swapRes = await contract.Swap(ctx, dto);

  
    expect(swapRes).toEqual(GalaChainResponse.Error(
      new ValidationFailedError("Invalid specified amount")
    ));


  })

  test("It will revert if slippage tolerance exceeds", async()=>{

    const fee = 500;

    const currencyInstance: TokenInstance = currency.tokenInstance();
    const currencyClassKey: TokenClassKey = currency.tokenClassKey();
    const currencyClass: TokenClass = currency.tokenClass();

    const dexInstance: TokenInstance = dex.tokenInstance();
    const dexClassKey: TokenClassKey = dex.tokenClassKey();
    const dexClass: TokenClass = dex.tokenClass();

    const poolObj = new Pool(
      dexClassKey.toString(),
      currencyClassKey.toString(),
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_0_05_PERCENT,
      new BigNumber("44.71236")
    );

    const currencyPoolBal: TokenBalance = plainToInstance(TokenBalance, {
      ...currency.tokenBalancePlain(),
      owner: poolObj.getPoolAlias()
    });
    currencyPoolBal.ensureCanAddQuantity(new BigNumber("5000")).add();

    const dexPoolBal: TokenBalance = plainToInstance(TokenBalance, {
      ...dex.tokenBalancePlain(),
      owner: poolObj.getPoolAlias()
    });

    const dexUserBal: TokenBalance = plainToInstance(TokenBalance, {
      ...dex.tokenBalancePlain(),
      owner: users.testUser1Id
    });

    const currencyUserBal: TokenBalance = plainToInstance(TokenBalance, {
      ...currency.tokenBalancePlain(),
      owner: users.testUser1Id
    });

    const currentSqrtPrice = new BigNumber("44.71236");
    const sqrtPriceLimit = currentSqrtPrice.multipliedBy(0.85);

    //Adding liquiidty the pool
    const positionData = new DexPositionData(
      poolObj.genPoolHash(),
      "POSITION-ID",
      887270,
      -887270,
      dexClassKey,
      currencyClassKey,
      fee
    );

    const tickLowerData = new TickData(poolObj.genPoolHash(), -887270);

    const tickUpperData = new TickData(poolObj.genPoolHash(), 887270);

    poolObj.mint(positionData, tickLowerData, tickUpperData, new BigNumber("80000"));

    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(
        currencyClass,
        currencyInstance,
        dexInstance,
        dexClass,
        poolObj,
        currencyPoolBal, 
        dexPoolBal,
        dexUserBal
      
      );

    const dto = new SwapDto(dexClassKey, currencyClassKey, fee, new BigNumber("1.5"), true, sqrtPriceLimit);
    dto.amountInMaximum = new BigNumber("1.2");

    const swapRes = await contract.Swap(ctx, dto);
    
    expect(swapRes).toEqual(GalaChainResponse.Error(
      new SlippageToleranceExceededError("Slippage tolerance exceeded: maximum allowed tokens (1.2) is less than required amount (1.5).")
    ));

  });

    test("It will revert if slipapge tolerance exceeds", async()=>{


    const fee = 500;

    const currencyInstance: TokenInstance = currency.tokenInstance();
    const currencyClassKey: TokenClassKey = currency.tokenClassKey();
    const currencyClass: TokenClass = currency.tokenClass();

    const dexInstance: TokenInstance = dex.tokenInstance();
    const dexClassKey: TokenClassKey = dex.tokenClassKey();
    const dexClass: TokenClass = dex.tokenClass();

    const poolObj = new Pool(
      dexClassKey.toString(),
      currencyClassKey.toString(),
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_0_05_PERCENT,
      new BigNumber("44.71236")
    );

    const currencyPoolBal: TokenBalance = plainToInstance(TokenBalance, {
      ...currency.tokenBalancePlain(),
      owner: poolObj.getPoolAlias()
    });
    currencyPoolBal.ensureCanAddQuantity(new BigNumber("8000")).add();

    const dexPoolBal: TokenBalance = plainToInstance(TokenBalance, {
      ...dex.tokenBalancePlain(),
      owner: poolObj.getPoolAlias()
    });

    const dexUserBal: TokenBalance = plainToInstance(TokenBalance, {
      ...dex.tokenBalancePlain(),
      owner: users.testUser1Id
    });

    dexUserBal.ensureCanAddQuantity(new BigNumber("5000")).add();

    const currencyUserBal: TokenBalance = plainToInstance(TokenBalance, {
      ...currency.tokenBalancePlain(),
      owner: users.testUser1Id
    });

    currencyUserBal.ensureCanAddQuantity(new BigNumber("5000")).add();


    const currentSqrtPrice = new BigNumber("44.71236");
    const sqrtPriceLimit = currentSqrtPrice.multipliedBy(0.85);

    //Adding liquiidty the pool
    const positionData = new DexPositionData(
      poolObj.genPoolHash(),
      "POSITION-ID",
      887270,
      -887270,
      dexClassKey,
      currencyClassKey,
      fee
    );

    const tickLowerData = new TickData(poolObj.genPoolHash(), -887270);

    const tickUpperData = new TickData(poolObj.genPoolHash(), 887270);

    poolObj.mint(positionData, tickLowerData, tickUpperData, new BigNumber("80000"));

    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(
        currencyClass,
        currencyInstance,
        dexInstance,
        dexClass,
        poolObj,
        currencyPoolBal, 
        dexPoolBal,
        dexUserBal
      );

    const dto = new SwapDto(dexClassKey, currencyClassKey, fee, new BigNumber("1.5"), true, sqrtPriceLimit);
    dto.amountOutMinimum = new BigNumber("-2995");

    const swapRes = await contract.Swap(ctx, dto);
   

    expect(swapRes).toEqual(GalaChainResponse.Error(
      new SlippageToleranceExceededError("Slippage tolerance exceeded: minimum received tokens (-2995) is less than actual received amount (-2994.7838668808669184).")
    ));

    });

    test("It will revert if there is not enough liquidity available in the pool", async()=>{
    
    const fee = 500;

    const currencyInstance: TokenInstance = currency.tokenInstance();
    const currencyClassKey: TokenClassKey = currency.tokenClassKey();
    const currencyClass: TokenClass = currency.tokenClass();

    const dexInstance: TokenInstance = dex.tokenInstance();
    const dexClassKey: TokenClassKey = dex.tokenClassKey();
    const dexClass: TokenClass = dex.tokenClass();

    const poolObj = new Pool(
      dexClassKey.toString(),
      currencyClassKey.toString(),
      dexClassKey,
      currencyClassKey,
      DexFeePercentageTypes.FEE_0_05_PERCENT,
      new BigNumber("44.71236")
    );

    const currencyPoolBal: TokenBalance = plainToInstance(TokenBalance, {
      ...currency.tokenBalancePlain(),
      owner: poolObj.getPoolAlias()
    });
    currencyPoolBal.ensureCanAddQuantity(new BigNumber("500")).add();

    const dexPoolBal: TokenBalance = plainToInstance(TokenBalance, {
      ...dex.tokenBalancePlain(),
      owner: poolObj.getPoolAlias()
    });

    const dexUserBal: TokenBalance = plainToInstance(TokenBalance, {
      ...dex.tokenBalancePlain(),
      owner: users.testUser1Id
    });

    dexUserBal.ensureCanAddQuantity(new BigNumber("500")).add();

    const currencyUserBal: TokenBalance = plainToInstance(TokenBalance, {
      ...currency.tokenBalancePlain(),
      owner: users.testUser1Id
    });

    currencyUserBal.ensureCanAddQuantity(new BigNumber("5000")).add();


    const currentSqrtPrice = new BigNumber("44.71236");
    const sqrtPriceLimit = currentSqrtPrice.multipliedBy(0.85);

    //Adding liquiidty the pool
    const positionData = new DexPositionData(
      poolObj.genPoolHash(),
      "POSITION-ID",
      887270,
      -887270,
      dexClassKey,
      currencyClassKey,
      fee
    );

    const tickLowerData = new TickData(poolObj.genPoolHash(), -887270);

    const tickUpperData = new TickData(poolObj.genPoolHash(), 887270);

    poolObj.mint(positionData, tickLowerData, tickUpperData, new BigNumber("80000"));

    const { ctx, contract, writes } = fixture(DexV3Contract)
      .callingUser(users.testUser1Id)
      .savedState(
        currencyClass,
        currencyInstance,
        dexInstance,
        dexClass,
        poolObj,
        currencyPoolBal, 
        dexPoolBal,
        dexUserBal
      );

    const dto = new SwapDto(dexClassKey, currencyClassKey, fee, new BigNumber("1.5"), true, sqrtPriceLimit);
    dto.amountOutMinimum = new BigNumber("-2990");

    const swapRes = await contract.Swap(ctx, dto);


    expect(swapRes).toEqual(GalaChainResponse.Error(
      new ConflictError("Not enough liquidity available in pool")
    ));


    })


  });


  
  



  



