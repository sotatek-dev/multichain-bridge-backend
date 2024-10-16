import { EAsset } from '../../../constants/api.constant.js';
import { EEventName, EEventStatus, ENetworkName } from '../../../constants/blockchain.constant.js';
import { EError } from '../../../constants/error.constant.js';
import { EventLogRepository } from '../../../database/repositories/event-log.repository.js';
import { initModuleTest } from '../../../shared/__test__/base/test.lib.js';
import { ETHBridgeContract } from '../../../shared/modules/web3/web3.service.js';
import { EventLog } from '../entities/index.js';
import { MultiSignature } from '../entities/multi-signature.entity.js';
import { SenderEVMBridge } from '../sender.evmbridge.js';

let senderEVMBridge: SenderEVMBridge;
let ethContract: jest.Mocked<ETHBridgeContract>;
let eventLogRepository: jest.Mocked<EventLogRepository>;
beforeEach(async () => {
  const { unit, unitRef } = await initModuleTest(SenderEVMBridge);
  senderEVMBridge = unit;
  eventLogRepository = unitRef.get<EventLogRepository>(EventLogRepository);
  ethContract = unitRef.get(ETHBridgeContract);
});

describe('handleValidateUnlockTxEVM', () => {
  const data: Partial<EventLog> = {
    id: 18,
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
    tip: '0.001',
    gasFee: '0.00001',
  };
  test('should handle validator signature generation', async () => {
    // mock pending tx in event_logs table to generate signatures.
    jest.spyOn(eventLogRepository, 'findOneBy').mockResolvedValue(data as EventLog);
    ethContract.getChainId.mockResolvedValue('0x123');
    const result = await senderEVMBridge.validateUnlockEVMTransaction(data.id!);
    expect(result.success).toBeTruthy();
  });

  test('should handle Unlock EVM and send to blockchain', async () => {
    // mock pending tx in eventlogs that has all valid signature then unlock
    jest.spyOn(eventLogRepository, 'findOne').mockResolvedValue(data as EventLog);
    ethContract.unlock.mockResolvedValue({ transactionHash: '0x123' } as any);
    const result = await senderEVMBridge.handleUnlockEVM(data.id!);
    expect(result.success).toBeTruthy();
  });

  test('should handle Unlock EVM and send to blockchain', async () => {
    // mock pending tx in eventlogs that has all valid signature then unlock
    const sentData = { ...data, status: EEventStatus.PROCESSING };
    jest.spyOn(eventLogRepository, 'findOne').mockResolvedValue(sentData as EventLog);

    const result = await senderEVMBridge.handleUnlockEVM(data.id!);
    // since sentData status is processing, senderEVMBridge won't process this.
    expect(result.error?.message).toEqual(EError.DUPLICATED_ACTION);
  });
});
