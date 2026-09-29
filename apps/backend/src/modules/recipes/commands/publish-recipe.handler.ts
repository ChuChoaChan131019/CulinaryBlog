import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { RecipeDto } from '../dto/recipe.dto';
import { PublishRecipeCommand } from './publish-recipe.command';
import { RecipeStatusService } from './recipe-status.service';

@CommandHandler(PublishRecipeCommand)
export class PublishRecipeHandler
  implements ICommandHandler<PublishRecipeCommand, RecipeDto>
{
  constructor(private readonly recipeStatus: RecipeStatusService) {}

  execute(command: PublishRecipeCommand): Promise<RecipeDto> {
    return this.recipeStatus.publish(command.recipeId, command.user);
  }
}
