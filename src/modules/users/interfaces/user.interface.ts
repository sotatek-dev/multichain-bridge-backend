import { IBaseAttribute } from '@core/base.interface';

export interface IUserInterface extends IBaseAttribute {
  walletAddress: string;
  password: string;
}
