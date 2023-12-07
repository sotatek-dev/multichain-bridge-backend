export interface IJwtPayload {
  userId: number;
  isVerified?: boolean;
}

export interface IGoogleResponse {
  sub: string;
  email: string;
  name: string;
}

export interface IUpdateEmail {
  userId: number;
  email: string;
  verificationCode: string;
}
