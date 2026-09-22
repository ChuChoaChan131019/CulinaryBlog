import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { PagedResult, RecipeSummaryDto } from '@culinary/shared';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateRecipeCommand } from './commands/create-recipe.command';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { RecipeDto } from './dto/recipe.dto';
import {
  GetRecipesQueryDto,
  GetRecipesQueryParams,
} from './dto/get-recipes-query.dto';
import { GetRecipesQuery } from './queries/get-recipes.query';

@Controller('recipes')
export class RecipesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Get()
  @UseGuards(OptionalJwtAuthGuard)
  getRecipes(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Query(
      new ValidationPipe({
        expectedType: GetRecipesQueryDto,
        errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
        transform: true,
        whitelist: true,
      }),
    )
    query: GetRecipesQueryParams,
  ): Promise<PagedResult<RecipeSummaryDto>> {
    return this.queryBus.execute(new GetRecipesQuery(query, user));
  }

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
