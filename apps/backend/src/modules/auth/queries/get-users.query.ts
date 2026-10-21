import { GetUsersQueryParams } from '../dto/get-users-query.dto';

export class GetUsersQuery {
  constructor(readonly params: GetUsersQueryParams) {}
}
