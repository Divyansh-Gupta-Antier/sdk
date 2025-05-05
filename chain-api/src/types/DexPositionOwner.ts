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
import { Exclude } from "class-transformer";
import { IsNotEmpty, IsString } from "class-validator";
import { JSONSchema } from "class-validator-jsonschema";

import { ChainKey } from "../utils";
import { IsUserAlias } from "../validators";
import { ChainObject } from "./ChainObject";

@JSONSchema({
    description:
      `Represents a position owned by a user in a decentralized exchange (DEX) pool.` +
      `Each position is linked to a specific pool, defined by tick range mappings, and associated with a unique position ID.` +
      `The position also includes ownership details and the pool's unique identifier.`
  })
export class DexPositionOwner extends ChainObject {
  @Exclude()
  static INDEX_KEY = "GCDPO"; //GalaChain Dex Position Owner

  @ChainKey({ position: 0 })
  @IsNotEmpty()
  @IsUserAlias()
  owner: string;

  @ChainKey({ position: 1 })
  @IsNotEmpty()
  @IsString()
  poolHash: string;

  @IsString({ each: true })
  tickRangeMap: Record<string, string>;

  /**
   * Intiializes a new DexPositionOwner instance.
   * @param owner - User alias of the position owner.
   * @param poolHash - Unique identifier of the pool.
   */
  constructor(owner: string, poolHash: string) {
    super();
    this.owner = owner;
    this.poolHash = poolHash;
  }

  /**
   * Adds or updates a position ID for the specified tick range.
   * @param tickRange - Tick range string to map (e.g., "10-20").
   * @param positionId - ID of the position to associate.
   */
  addPosition(tickRange: string, positionId: string): void {
    this.tickRangeMap[tickRange] = positionId;
  }

  /**
   * Removes the position mapping for the given tick range.
   * @param tickRange - Tick range string to remove.
   */
  removePosition(tickRange: string): void {
    delete this.tickRangeMap[tickRange];
  }

  /**
   * Retrieves the position ID for the specified tick range.
   * @param tickRange - Tick range string to look up.
   * @returns The associated position ID, or undefined if not found.
   */
  getPositionId(tickRange: string): string | undefined {
    return this.tickRangeMap[tickRange];
  }
}
