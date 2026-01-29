import { SetMetadata } from '@nestjs/common';
import { AccountRole } from '@/database/entities';

export const ROLES_KEY = 'roles';

export const Roles = (...roles: AccountRole[]) => SetMetadata(ROLES_KEY, roles);
