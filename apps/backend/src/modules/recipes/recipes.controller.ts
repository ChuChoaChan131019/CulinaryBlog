import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateRecipeCommand } from './commands/create-recipe.command';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { RecipeDto } from './dto/recipe.dto';

@Controller('recipes')
export class RecipesController {
  constructor(private readonly commandBus: CommandBus) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Author', 'Admin')
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateRecipeDto,
  ): Promise<RecipeDto> {
    return this.commandBus.execute(
      new CreateRecipeCommand(
        user.id,
        dto.title,
        dto.description,
        dto.categoryId,
        dto.prepTime,
        dto.cookTime,
        dto.servings,
        dto.difficulty,
        dto.instructions,
        dto.nutrition,
        dto.steps,
        dto.ingredients,
      ),
    );
  }
}
