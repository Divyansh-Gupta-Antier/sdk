import { BigNumberProperty, ChainKey, ChainObject, ValidationFailedError } from "@gala-chain/api";
import BigNumber from "bignumber.js";
import { Exclude } from "class-transformer";
import { IsBoolean, IsNumber, IsString } from "class-validator";

export class TickData extends ChainObject {
  @Exclude()
  static INDEX_KEY = "GCTDO";
  @ChainKey({ position: 0 })
  @IsString()
  public readonly poolHash: string;
  @ChainKey({ position: 1 })
  @IsNumber()
  public readonly tick: number;

  @BigNumberProperty()
  liquidityGross: BigNumber;
  @IsBoolean()
  initialised: boolean;
  @BigNumberProperty()
  liquidityNet: BigNumber;
  @BigNumberProperty()
  feeGrowthOutside0: BigNumber;
  @BigNumberProperty()
  feeGrowthOutside1: BigNumber;

  constructor(poolHash: string, tick: number) {
    super();
    this.poolHash = poolHash;
    this.tick = tick;
    this.liquidityGross = new BigNumber(0);

    this.initialised = false;
    this.liquidityNet = new BigNumber(0);
    this.feeGrowthOutside0 = new BigNumber(0);
    this.feeGrowthOutside1 = new BigNumber(0);
  }

  updateTick(
    tick: number,
    tickCurrent: number,
    liquidityDelta: BigNumber,
    upper: boolean,
    feeGrowthGlobal0: BigNumber,
    feeGrowthGlobal1: BigNumber,
    maxLiquidity: BigNumber
  ): boolean {
    //initialise tickData for the required tick

    const liquidityGrossBefore = new BigNumber(this.liquidityGross);
    const liquidityGrossAfter = new BigNumber(liquidityGrossBefore).plus(liquidityDelta);

    if (liquidityGrossAfter.isGreaterThan(maxLiquidity))
      throw new ValidationFailedError("liquidity crossed max liquidity");

    //update liquidity gross and net
    this.liquidityGross = liquidityGrossAfter;
    this.liquidityNet = upper
      ? new BigNumber(this.liquidityNet).minus(liquidityDelta)
      : new BigNumber(this.liquidityNet).plus(liquidityDelta);

    //tick is initialised for the first time
    if (liquidityGrossBefore.isEqualTo(0)) {
      if (tick <= tickCurrent) {
        this.feeGrowthOutside0 = feeGrowthGlobal0;
        this.feeGrowthOutside1 = feeGrowthGlobal1;
      }
      this.initialised = true;
      return true;
    }

    //either tick is turning on or off
    const flipped = liquidityGrossBefore.isEqualTo(0) != liquidityGrossAfter.isEqualTo(0);

    return flipped;
  }
}
