import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { CommonConfigRepository } from 'database/repositories/common-configuration.repository';
import { CrawlContractRepository } from 'database/repositories/crawl-contract.repository';
import { EventLogRepository } from 'database/repositories/event-log.repository';
import { MultiSignatureRepository } from 'database/repositories/multi-signature.repository';
import { TokenPairRepository } from 'database/repositories/token-pair.repository';
import { DataSource, QueryRunner } from 'typeorm';

import { ConfigurationModule } from '@config/config.module';

import { EAsset } from '@constants/api.constant';
import { EEventName, EEventStatus, ENetworkName, ETokenPairStatus } from '@constants/blockchain.constant';

import { TokenPair } from '@modules/users/entities/tokenpair.entity';

import { LoggerService } from '@shared/modules/logger/logger.service';
import { Web3Module } from '@shared/modules/web3/web3.module';
import { ETHBridgeContract } from '@shared/modules/web3/web3.service';

import { EventLog } from '../entities';
import { CommonConfig } from '../entities/common-config.entity';
import { MultiSignature } from '../entities/multi-signature.entity';
import { SenderEVMBridge } from '../sender.evmbridge';

let senderEVMBridge: SenderEVMBridge;
let dataSource: DataSource;
let queryRunner: QueryRunner;
let eventLogRepository: EventLogRepository;
let commonConfigRepository: CommonConfigRepository;
let tokenPairRepository: TokenPairRepository;
let multiSignatureRepository: MultiSignatureRepository;
let loggerService: LoggerService;
let newEthBridgeContract: ETHBridgeContract;
// Mock objects
const mockJwtService = {
  // Mock methods if needed
  sign: jest.fn(),
};

beforeEach(async () => {
  const module: TestingModule = await Test.createTestingModule({
    imports: [
      Web3Module,
      ConfigurationModule,
      ConfigModule.forRoot({
        isGlobal: true,
      }),
    ],
    providers: [
      SenderEVMBridge, // Include the AuthService provider
      EventLogRepository,
      CommonConfigRepository,
      MultiSignatureRepository,
      {
        provide: ETHBridgeContract,
        useValue: {
          getValidatorThreshold: jest.fn(),
        },
      },
      { provide: JwtService, useValue: mockJwtService },
      {
        provide: DataSource,

        useValue: {
          createQueryRunner: jest.fn().mockReturnValue({
            connect: jest.fn(),
            startTransaction: jest.fn(),
            commitTransaction: jest.fn(),
            rollbackTransaction: jest.fn(),
            release: jest.fn(),
            manager: {
              save: jest.fn(),
              findOne: jest.fn(),
              update: jest.fn(),
              findOneBy: jest.fn(),
            },
          }),
        },
      },
      {
        provide: CrawlContractRepository,
        useValue: {
          findOne: jest.fn(),
          create: jest.fn(),
          save: jest.fn(),
        },
      },
      {
        provide: TokenPairRepository,
        useValue: {
          getTokenPair: jest.fn(),
        },
      },
      {
        provide: LoggerService,
        useValue: {
          getLogger: jest.fn().mockReturnValue({
            info: jest.fn(),
            log: jest.fn(),
          }),
        },
      },
    ],
  }).compile();

  newEthBridgeContract = module.get<ETHBridgeContract>(ETHBridgeContract);
  senderEVMBridge = module.get<SenderEVMBridge>(SenderEVMBridge);
  dataSource = module.get<DataSource>(DataSource);
  queryRunner = dataSource.createQueryRunner();
  eventLogRepository = module.get<EventLogRepository>(EventLogRepository);
  commonConfigRepository = module.get<CommonConfigRepository>(CommonConfigRepository);
  tokenPairRepository = module.get<TokenPairRepository>(TokenPairRepository);
  multiSignatureRepository = module.get<MultiSignatureRepository>(MultiSignatureRepository);
  loggerService = module.get<LoggerService>(LoggerService);
});

describe('handleValidateUnlockTxEVM', () => {
  const commonConfig = {
    id: 1,
    dailyQuota: 500,
    tip: 0.5,
    asset: 'ETH',
  } as CommonConfig;

  const tokenPair = {
    id: 2,
    fromChain: ENetworkName.MINA,
    toChain: ENetworkName.ETH,
    fromSymbol: EAsset.WETH,
    toSymbol: EAsset.ETH,
    fromAddress: 'B62qqki2ZnVzaNsGaTDAP6wJYCth5UAcY6tPX2TQYHdwD8D4uBgrDKC',
    toAddress: '0x0000000000000000000000000000000000000000',
    fromDecimal: 9,
    toDecimal: 18,
    fromScAddress: 'B62qoArtCz52mtxKxtGR3sPdS9yq6DucRW53nAerndwg9oEhUvJvpRy',
    toScAddress: '0x83e21AccD43Bb7C23C51e68fFa345fab3983FfeC',
    status: ETokenPairStatus.ENABLE,
  } as TokenPair;

  const data = {
    id: 18,
    deletedAt: null,
    senderAddress: 'B62qjWwgHupW7k7fcTbb2Kszp4RPYBWYdL4KMmoqfkMH3iRN2FN8u5n',
    amountFrom: '2',
    tokenFromAddress: 'B62qqki2ZnVzaNsGaTDAP6wJYCth5UAcY6tPX2TQYHdwD8D4uBgrDKC',
    networkFrom: ENetworkName.MINA,
    tokenFromName: 'WETH',
    txHashLock: '5JuRCbe4Bu9gbQBbLugbVLateiRNLa8YdJRvfWtvy9iuiNpVXuqr',
    receiveAddress: '0x242CF8b33B29aa18205d07467f69177d2c4295DF',
    amountReceived: '1989900500',
    tokenReceivedAddress: '0x0000000000000000000000000000000000000000',
    networkReceived: ENetworkName.ETH,
    tokenReceivedName: EAsset.ETH,
    txHashUnlock: '0xc1674376040b6cfed204930c5dfd0aae568c3d09e1602bf9fd084fb50bbf40f2',
    blockNumber: 345594,
    blockTimeLock: 1725877528,
    protocolFee: '10099500',
    event: EEventName.LOCK,
    toTokenDecimal: 18,
    status: EEventStatus.WAITING,
    retry: 0,
    validator: [] as MultiSignature[],
  } as EventLog;
  it('should handle validator signature generation', async () => {
    const wallet = senderEVMBridge.getWallet();

    data.validator.push({
      validator: wallet.address,
      txId: 18,
      retry: 2,
      signature:
        '0xc096d8abb2af534fa09b62ca3825a202172239ee0ab3d8438680faca0f0e59153fef0bdc0681162d94cad9fe77b05d4c1945be9c46cb89f9b2821d8576fb28d31b',
    } as MultiSignature);
    jest.spyOn(eventLogRepository, 'getValidatorPendingSignature').mockResolvedValue(data);
    jest.spyOn(commonConfigRepository, 'getCommonConfig').mockResolvedValue(commonConfig);
    jest.spyOn(tokenPairRepository, 'getTokenPair').mockResolvedValue(tokenPair);
    jest.spyOn(multiSignatureRepository, 'findOne').mockResolvedValue(data.validator[0]);
    jest.spyOn(multiSignatureRepository, 'update').mockResolvedValue(undefined);

    await senderEVMBridge.unlockEVMTransaction();

    expect(eventLogRepository.getValidatorPendingSignature).toHaveBeenCalled();
    expect(commonConfigRepository.getCommonConfig).toHaveBeenCalled();
    expect(tokenPairRepository.getTokenPair).toHaveBeenCalled();
  });

  it('should handle Unlock EVM and send to blockchain', async () => {
    const threshold = await newEthBridgeContract.getValidatorThreshold();
    expect(threshold).toBe('1');
    jest.spyOn(commonConfigRepository, 'getCommonConfig').mockResolvedValue(commonConfig);
    jest.spyOn(eventLogRepository, 'getEventLockWithNetwork').mockResolvedValue(data);
    jest.spyOn(eventLogRepository, 'updateLockEvenLog').mockResolvedValue(undefined);
    jest.spyOn(tokenPairRepository, 'getTokenPair').mockResolvedValue(tokenPair);
    jest.spyOn(eventLogRepository, 'updateStatusAndRetryEvenLog').mockResolvedValue(undefined);

    await senderEVMBridge.handleUnlockEVM();
  });
});
