import { TestBedBuilder } from '@automock/core';
import { TestBed } from '@automock/jest';
import { Type } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import { ObjectLiteral, Repository } from 'typeorm';

import { LoggerService } from '../../modules/logger/logger.service.js';

/**
 * get a mocked repository
 * @returns `mockedRepo` that can be used like `mockedRepo.findOne.mockedResolvedValue()`
 */
export const getMockedRepo = <T extends ObjectLiteral>(): jest.Mocked<Repository<T>> => {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  } as any;
};

/**
 * init test environment for injectable class.
 * @param cls the class we want to write unit tests.
 * @param customBuilder using builder to mock cls dependencies data i.e
 * ```js
 *    const { unit, unitRef } = await initModuleTest(SenderEVMBridge, b =>
 *    b.mock(ETHBridgeContract).using({
 *        getChainId: () => '0x123',
 *        unlock: () => ({ transactionHash: '0x123' }),
 *    }),
 *    );
 * ```
 * @returns TestBedUnit that has unit and unitRef, unit is the instance of the cls and unitRef helps getting mocked dependencies of cls.
 */
export const initModuleTest = async (
  cls: Type<any>,
  customBuilder?: (builder: TestBedBuilder<any>) => TestBedBuilder<any>,
) => {
  const moduleRef = await Test.createTestingModule({
    imports: [ConfigModule],
  }).compile();
  const builder = TestBed.create(cls)
    .mock(LoggerService) // we want to log extra info
    .using({
      getLogger: jest.fn(() => ({
        error: jest.fn(),
        info: jest.fn(),
        warn: jest.fn(),
      })),
    })
    .mock(ConfigService) // we want to read env file.
    .using(moduleRef.get(ConfigService));
  if (customBuilder) {
    customBuilder(builder);
  }
  return builder.compile();
};
