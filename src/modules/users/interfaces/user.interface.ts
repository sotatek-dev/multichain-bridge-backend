import { IBaseAttribute } from '@core/base.interface';

export interface IUserInterface extends IBaseAttribute {
  email: string;
  password: string;
}
