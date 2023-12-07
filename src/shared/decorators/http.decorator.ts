import { applyDecorators, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';

import { AdminGuard } from '@guards/roles/admin.guard';
import { SuperAdminGuard } from '@guards/roles/super-admin.guard';
import { UserGuard } from '@guards/roles/user.guard';

export function AuthUserGuard(): MethodDecorator {
  return applyDecorators(UseGuards(UserGuard), ApiBearerAuth('Authorization'));
}

export function AuthAdminGuard(): MethodDecorator {
  return applyDecorators(UseGuards(AdminGuard), ApiBearerAuth('Authorization'));
}

export function AuthSuperAdminGuard(): MethodDecorator {
  return applyDecorators(UseGuards(SuperAdminGuard), ApiBearerAuth('Authorization'));
}
