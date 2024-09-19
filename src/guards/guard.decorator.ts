import { SetMetadata } from '@nestjs/common';

import { EGuardDecoratorKey } from '../constants/guards.constant.js';

export const GuardPublic = () => SetMetadata(EGuardDecoratorKey.IS_PUBLIC_KEY, true);

export const GuardPublicOrAuth = () => SetMetadata(EGuardDecoratorKey.IS_PUBLIC_OR_AUTH_KEY, true);
