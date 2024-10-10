import { ObjectLiteral, Repository } from 'typeorm';

export const getMockedRepo = <T extends ObjectLiteral>(): Repository<T> => {
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  } as any as Repository<T>;
};
