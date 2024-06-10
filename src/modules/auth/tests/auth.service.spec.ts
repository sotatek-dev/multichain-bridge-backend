import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { ConfigurationModule } from '@config/config.module';

import { Web3Module } from '@shared/modules/web3/web3.module';

import { UserRepository } from '../../../database/repositories/user.repository';
import { AuthService } from '../auth.service';

// Assuming AuthService houses the login function

// Mock objects
const mockJwtService = {
  // Mock methods if needed
  sign: jest.fn(),
};

const mockDataSource = {
  // Mock methods if needed
};
const mockUserRepository = {
  findOneBy: jest.fn(),
};
describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [Web3Module, ConfigurationModule],
      providers: [
        AuthService, // Include the AuthService provider
        { provide: JwtService, useValue: mockJwtService },
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should login using EVM signature', async () => {
    const validAddress = '0x2c7536E3605D9C16a7a3D7b1898e529396a65c23';
    const validSignature =
      '0xb91467e570a6466aa9e9876cbcd013baba02900b8979d43fe208a4a4f339f5fd6007e74cd82e037b800186422fc2da167c747ef045e5d18a5f5d4300f8e1a0291c';
    const mockAdmin = { id: 1, address: validAddress };
    mockUserRepository.findOneBy.mockResolvedValue(mockAdmin);
    mockJwtService.sign.mockResolvedValue('true');
    const result = await authService.login({ address: validAddress, signature: validSignature });

    expect(result).toBeDefined();
    expect(result.accessToken).toBeTruthy();
  });
  it('should login using Mina signature', async () => {
    const params = {
      address: 'B62qph8sAdxKn1JChJRLzCWek7kkdi8QPLWdfhpFEMDNbM4Ficpradb',
      signature: {
        field: '13103062255371554830871806571266501056569826727061194167717383802935285095667',
        scalar: '8184099996718391251128744530931690607354984861474783138892757893603123747186',
      },
    };
    const mockAdmin = { id: 1, address: params.address };
    mockUserRepository.findOneBy.mockResolvedValue(mockAdmin);
    mockJwtService.sign.mockResolvedValue('true');
    const result = await authService.loginMina(params);

    expect(result).toBeDefined();
    expect(result.accessToken).toBeTruthy();
  });
  // ... other test cases as before (omitted for brevity)
});
