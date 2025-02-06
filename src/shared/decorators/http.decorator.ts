import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { AdminGuard } from '../../guards/roles/user.guard.js';

export function AuthAdminGuard(): MethodDecorator {
  return applyDecorators(UseGuards(AdminGuard), ApiBearerAuth('Authorization'));
}
