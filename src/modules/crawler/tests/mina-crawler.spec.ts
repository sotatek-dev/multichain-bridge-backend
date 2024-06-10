import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { DataSource } from 'typeorm';

import { ConfigurationModule } from '@config/config.module';

import { Web3Module } from '@shared/modules/web3/web3.module';

import { UserRepository } from '../../../database/repositories/user.repository';
import { SCBridgeMinaCrawler } from '../crawler.minabridge';

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
  let minaCrawlerService: SCBridgeMinaCrawler;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [Web3Module, ConfigurationModule],
      providers: [
        SCBridgeMinaCrawler, // Include the AuthService provider
        { provide: JwtService, useValue: mockJwtService },
        { provide: UserRepository, useValue: mockUserRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    minaCrawlerService = module.get<SCBridgeMinaCrawler>(SCBridgeMinaCrawler);
  });

  it('should handle lock events', async () => {
    mockJwtService.sign.mockResolvedValue('true');
    const result = await minaCrawlerService.handleEventCrawlBlock();

    expect(result).toBeDefined();
  });

  // ... other test cases as before (omitted for brevity)
});
