import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { ConfigurationModule } from '../../../config/config.module.js';
import { UserRepository } from '../../../database/repositories/user.repository.js';
import { LoggingModule } from '../../../shared/modules/logger/logger.module.js';
import { Web3Module } from '../../../shared/modules/web3/web3.module.js';
import { AuthService } from '../auth.service.js';

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
      imports: [Web3Module, ConfigurationModule, LoggingModule],
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
    const validAddress = '0xa314aec0369ca4549b3d9f4292d09f670b952f3f';
    const validSignature =
      '0x4760979a8090601220a64c5b193244fbae812f376a872bb43a448fd160a58837322e6cb0b7feffbae7ae98dbce6486f339f522747dd6466754cf401d45ee73eb1c';
    const mockAdmin = { id: 1, address: validAddress };
    mockUserRepository.findOneBy.mockResolvedValue(mockAdmin);
    mockJwtService.sign.mockResolvedValue('true');
    const result = await authService.login({ address: validAddress, signature: validSignature });

    expect(result).toBeDefined();
    expect(result.accessToken).toBeTruthy();
  });
  it('should login using Mina signature', async () => {
    const params = {
      address: 'B62qr28GA4raLgQJ5qKUPWXhqiYrvKNUfYc4LH68Wy5Wfz4siHsAMns',
      signature: {
        field: '23867494981697191112088838620086511427092912257005103911765468688550440174378',
        scalar: '18159641895943933705777069237044057980313596858212133501465907817886780404455',
      },
    };
    const mockAdmin = { id: 1, address: params.address };
    mockUserRepository.findOneBy.mockResolvedValue(mockAdmin);
    mockJwtService.sign.mockResolvedValue('true');
    const result = await authService.loginMina(params);

    expect(result).toBeDefined();
    expect(result?.accessToken).toBeTruthy();
  });
  // ... other test cases as before (omitted for brevity)
});
