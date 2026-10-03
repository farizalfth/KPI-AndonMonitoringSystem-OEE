import type { User } from '@andon/shared';

import { badRequest, conflict, forbidden, notFound } from '../../../lib/errors';
import { hashPassword } from '../../auth/auth.service';
import { roleRepository } from '../../../models/masterdata.model';
import {
  countActiveAdmins,
  countUsersByEmail,
  createUser,
  deleteUser,
  findUserById,
  listUsers,
  updateUser,
} from '../../../models/user.model';
import type { CreateUserInput, UpdateUserInput } from './user.schemas';

/**
 * User management service (member 1).
 *
 * Rules enforced here, not only in the UI:
 *  - email stays unique (case insensitive, stored lower case);
 *  - `roleId` must reference an existing role;
 *  - you cannot delete or deactivate your own account;
 *  - the last active ADMIN account cannot be removed or deactivated.
 */
async function assertRoleExists(roleId: string): Promise<void> {
  const role = await roleRepository.findById(roleId);
  if (!role) throw badRequest(`Role ${roleId} does not exist`);
}

async function assertNotLastAdmin(user: User, action: 'deactivate' | 'delete'): Promise<void> {
  if (!user.isActive || user.roleCode !== 'ADMIN') return;
  if ((await countActiveAdmins()) <= 1) {
    throw forbidden(`Cannot ${action} the last active administrator`);
  }
}

export const userService = {
  list: listUsers,

  async get(id: string): Promise<User> {
    const user = await findUserById(id);
    if (!user) throw notFound('User', id);
    return user;
  },

  async create(input: CreateUserInput): Promise<User> {
    if ((await countUsersByEmail(input.email)) > 0) {
      throw conflict(`Email ${input.email} is already registered`);
    }
    await assertRoleExists(input.roleId);

    const passwordHash = await hashPassword(input.password);
    return createUser({ ...input, passwordHash });
  },

  async update(id: string, input: UpdateUserInput, actorId: string): Promise<User> {
    const existing = await this.get(id);

    if (input.email && input.email !== existing.email) {
      if ((await countUsersByEmail(input.email, id)) > 0) {
        throw conflict(`Email ${input.email} is already registered`);
      }
    }
    if (input.roleId) await assertRoleExists(input.roleId);

    if (input.isActive === false) {
      if (existing.id === actorId) throw forbidden('You cannot deactivate your own account');
      await assertNotLastAdmin(existing, 'deactivate');
    }

    const passwordHash = input.password ? await hashPassword(input.password) : undefined;
    return updateUser(id, { ...input, passwordHash });
  },

  async resetPassword(id: string, password: string): Promise<User> {
    await this.get(id);
    const passwordHash = await hashPassword(password);
    return updateUser(id, { passwordHash });
  },

  async remove(id: string, actorId: string): Promise<void> {
    const existing = await this.get(id);
    if (existing.id === actorId) throw forbidden('You cannot delete your own account');
    await assertNotLastAdmin(existing, 'delete');

    await deleteUser(id);
  },
};