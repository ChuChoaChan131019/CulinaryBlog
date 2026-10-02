import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RecipeDto } from '../dto/recipe.dto';
import { ArchiveRecipeCommand } from './archive-recipe.command';
import { RecipeStatusService } from './recipe-status.service';

@CommandHandler(ArchiveRecipeCommand)
export class ArchiveRecipeHandler
  implements ICommandHandler<ArchiveRecipeCommand, RecipeDto>
{
  constructor(private readonly recipeStatus: RecipeStatusService) {}

  execute(command: ArchiveRecipeCommand): Promise<RecipeDto> {
    return this.recipeStatus.archive(command.recipeId, command.user);
  }
}
