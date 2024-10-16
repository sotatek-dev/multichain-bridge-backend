import { ENetworkName } from '../../../constants/blockchain.constant.js';
import { CommonConfigRepository } from '../../../database/repositories/common-configuration.repository.js';
import { TokenPairRepository } from '../../../database/repositories/token-pair.repository.js';
import { initModuleTest } from '../../../shared/__test__/base/test.lib.js';
import { addDecimal } from '../../../shared/utils/bignumber.js';
import { UsersService } from '../users.service.js';

describe('estimate unlock/minting fee for users', () => {
  let userService: UsersService;
  let configRepo: jest.Mocked<CommonConfigRepository>;
  let tokenPairRepo: jest.Mocked<TokenPairRepository>;

  beforeAll(async () => {
    const { unit, unitRef } = await initModuleTest(UsersService);
    userService = unit;
    configRepo = unitRef.get(CommonConfigRepository);
    tokenPairRepo = unitRef.get(TokenPairRepository);

    configRepo.getCommonConfig.mockResolvedValue({
      id: 1,
      feeUnlockEth: '0.001',
      feeUnlockMina: '0.002',
    } as any);
  });
  it('fee from mina -> eth', async () => {
    tokenPairRepo.findOneBy.mockResolvedValue({
      id: 1,
      toChain: ENetworkName.ETH,
    } as any);
    const res = await userService.getProtocolFee({ pairId: 1 });
    expect(res.gasFee).toEqual(addDecimal(0.001, 18));
  });
  it('fee from eth -> mina', async () => {
    tokenPairRepo.findOneBy.mockResolvedValue({
      id: 1,
      toChain: ENetworkName.MINA,
    } as any);
    const res = await userService.getProtocolFee({ pairId: 1 });
    expect(res.gasFee).toEqual(addDecimal(0.002, 9));
  });
});
