import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
  ValidationPipe,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { ApiBearerAuth, ApiHeader, ApiTags } from '@nestjs/swagger';
import { PagedResult, RecipeSummaryDto } from '@culinary/shared';
import type { Response } from 'express';
import { AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CreateRecipeCommand } from './commands/create-recipe.command';
import { UpdateRecipeCommand } from './commands/update-recipe.command';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { RecipeDto } from './dto/recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import {
  GetRecipesQueryDto,
  GetRecipesQueryParams,
} from './dto/get-recipes-query.dto';
import { GetRecipesQuery } from './queries/get-recipes.query';

@ApiTags('recipes')
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
  @ApiBearerAuth()
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

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('Author', 'Admin')
  @ApiBearerAuth()
  @ApiHeader({
    name: 'If-Match',
    required: true,
    description: 'Row version hiện tại, ví dụ: "3"',
  })
  async update(
    @Param(
      'id',
      new ParseUUIDPipe({ errorHttpStatusCode: HttpStatus.BAD_REQUEST }),
    )
    id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Headers('if-match') ifMatch: string | undefined,
    @Body() dto: UpdateRecipeDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<RecipeDto> {
    const expectedRowVersion = this.parseIfMatch(ifMatch);
    const result = await this.commandBus.execute<
      UpdateRecipeCommand,
      RecipeDto
    >(new UpdateRecipeCommand(id, user, expectedRowVersion, dto));

    response.setHeader('ETag', `"${result.rowVersion}"`);
    return result;
  }

  private parseIfMatch(ifMatch: string | undefined): number {
    const value = ifMatch?.trim();
    const match = value?.match(/^(?:"([1-9]\d*)"|([1-9]\d*))$/);
    const rowVersion = Number(match?.[1] ?? match?.[2]);

    if (!match || !Number.isSafeInteger(rowVersion)) {
      throw new BadRequestException({
        type: 'VALIDATION_ERROR',
        title: 'If-Match không hợp lệ',
        status: 400,
        detail: 'If-Match phải chứa rowVersion là số nguyên dương',
      });
    }

    return rowVersion;
  }
}
