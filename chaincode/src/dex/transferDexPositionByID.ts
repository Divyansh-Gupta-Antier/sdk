import { DexPositionOwner, NotFoundError, Pool, TransferPositionIdDTO } from "@gala-chain/api";
import { getUserPositionIds, putChainObject } from "@gala-chain/chaincode";
import { getObjectByKey } from "@gala-chain/chaincode";

import { GalaChainContext } from "../types";

export async function transferDexPositionByID(
  ctx: GalaChainContext,
  dto: TransferPositionIdDTO
): Promise<DexPositionOwner> {
  const key = ctx.stub.createCompositeKey(Pool.INDEX_KEY, [
    dto.token0.toString(),
    dto.token1.toString(),
    dto.fee.toString()
  ]);

  const pool = await getObjectByKey(ctx, Pool, key);
  const poolHash = pool.genPoolHash();

  const senderpositionsID = await getUserPositionIds(ctx, ctx.callingUser, poolHash);
  const fetchedTickRange = senderpositionsID.getTickRangeByPositionId(dto.positionId);

  if (!fetchedTickRange) {
    throw new NotFoundError(`${ctx.callingUser} does not hold hold any position for given ${dto.positionId} for this pool`);
  }

  senderpositionsID.removePosition(fetchedTickRange, dto.positionId);

  await putChainObject(ctx, senderpositionsID);

  //Add Recepients position
  const recipientPositions = await getObjectByKey(
    ctx,
    DexPositionOwner,
    new DexPositionOwner(dto.toAddress, poolHash).getCompositeKey()
  ).catch(() => new DexPositionOwner(dto.toAddress, poolHash));

  recipientPositions.addPosition(fetchedTickRange, dto.positionId);

  await putChainObject(ctx, recipientPositions);

  return recipientPositions;
}
