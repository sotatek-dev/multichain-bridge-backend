import { IBaseAttribute } from '../../../core/base.interface.js';

export interface IUserInterface extends IBaseAttribute {
  walletAddress: string;
  name: string;
}
