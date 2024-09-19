import { EDirection } from "../../constants/api.constant.js";

export interface IPagination {
  useLimit?: boolean;
  limit: number;
  page: number;
  sortBy?: string;
  direction?: EDirection;
}
