import { AuthenticatedUser } from '../../../common/auth/authenticated-user';
import { UpdateUserDto } from '../dto/update-user.dto';

export class UpdateUserCommand {
  constructor(
    public readonly userId: string,
    public readonly currentUser: AuthenticatedUser,
    public readonly dto: UpdateUserDto,
  ) {}
}
