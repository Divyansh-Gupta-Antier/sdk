import { NotFoundError } from './../../../chain-api/src/utils/error';
import { contracts } from './../../../chain-cli/chaincode-template/src/index';
import { DexV3Contract } from './../__test__/TestDexV3Contract';

import { DexFeePercentageTypes, DexPositionData, GetPositionByIdDto, Pool, TokenClassKey } from "@gala-chain/api";
import { currency, dex, fixture, users } from "@gala-chain/test";
import BigNumber from "bignumber.js";
import { removePositionIfEmpty } from './removePositionIfEmpty';
import { getPositionById } from './getPositionById';
import { deleteChainObject } from '../utils';

describe("Remove Position if Empty", ()=>{

    const currencyClassKey: TokenClassKey = currency.tokenClassKey();
    const dexClassKey: TokenClassKey = dex.tokenClassKey();

    const fee = 500;

    const poolObj = new Pool(
        dexClassKey.toString(),
        currencyClassKey.toString(),
        dexClassKey,
        currencyClassKey,
        DexFeePercentageTypes.FEE_0_05_PERCENT,
        new BigNumber("44.71236")
      );
    

    test("Should delete position if token if tokensOwed0, tokensOwed1, and liquidity are negligible", async()=>{
       

       const position = new DexPositionData(poolObj.genPoolHash(),"POSITION-ID",76110,75920,dexClassKey,currencyClassKey,fee);
        position.tokensOwed0 = new BigNumber("0.000000005");
        position.tokensOwed1 = new BigNumber("0.000000005");
        position.liquidity = new BigNumber("0.00000005");

        const {ctx, writes} = fixture(DexV3Contract).callingUser(users.testUser1Id).savedState(position, poolObj);

        const getPositionDTO = new GetPositionByIdDto(); 
        getPositionDTO.poolHash = poolObj.genPoolHash();
        getPositionDTO.tickUpper = 76110;
        getPositionDTO.tickLower = 75920;
        getPositionDTO.positionId = "POSITION-ID"

        const getUserPositionResBefore = await getPositionById(ctx,getPositionDTO);
        console.log("GetPosition id respinse", JSON.stringify(getUserPositionResBefore));
        
        expect(await removePositionIfEmpty(ctx, poolObj.genPoolHash(), position)).toThrow(NotFoundError);
       


    });

    test("Should NOT delete position if tokens or liquidity are above threashold ", async()=>{

        const position = new DexPositionData(poolObj.genPoolHash(),"POSITION-ID",76110,75920,dexClassKey,currencyClassKey,fee);
        position.tokensOwed0 = new BigNumber("0.000005");
        position.tokensOwed1 = new BigNumber("0.00005");
        position.liquidity = new BigNumber("0.00005");

        const {ctx} = fixture(DexV3Contract).callingUser(users.testUser1Id).savedState(position, poolObj);

        const res = await removePositionIfEmpty(ctx, poolObj.genPoolHash(), position);

        console.log("Response for remove position is ", res);
      //  expect(deleteChainObject).toHaveBeenCalledWith(ct)
        



    })
})