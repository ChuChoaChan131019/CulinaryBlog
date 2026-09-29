import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RecipeDto } from '../dto/recipe.dto';
import { RecipeStatusService } from './recipe-status.service';
import { UnpublishRecipeCommand } from './unpublish-recipe.command';

@CommandHandler(UnpublishRecipeCommand)
export class UnpublishRecipeHandler
  implements ICommandHandler<UnpublishRecipeCommand, RecipeDto>
{
  constructor(private readonly recipeStatus: RecipeStatusService) {}

  execute(command: UnpublishRecipeCommand): Promise<RecipeDto> {
    return this.recipeStatus.unpublish(command.recipeId, command.user);
  }
}
